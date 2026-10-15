import asyncio
import logging
from datetime import timedelta
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, WebSocket, WebSocketDisconnect, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from jose import JWTError, jwt
from starlette.concurrency import run_in_threadpool

from app import auth_utils, database, models, schemas
from app.notification_utils import display_name
from app.social_realtime import consume_websocket_ticket, get_async_client, publish_social_event, realtime_enabled

router = APIRouter(prefix="/social/posts", tags=["Social feed"])
logger = logging.getLogger(__name__)


def _ensure_interaction_allowed(current_user: models.User) -> None:
    if current_user.is_admin:
        raise HTTPException(status_code=403, detail="Tài khoản quản trị chỉ dùng để kiểm duyệt")


def _ensure_community_guidelines(db: Session, current_user: models.User) -> None:
    accepted = db.query(models.UserPolicyAcceptance.user_id).filter_by(user_id=current_user.id).first()
    if not accepted:
        raise HTTPException(
            status_code=428,
            detail="Vui lòng chấp nhận quy tắc cộng đồng trước khi đăng hoặc bình luận",
        )


def _blocked_user_ids(db: Session, user_id: int) -> set[int]:
    rows = db.query(models.UserBlock.blocker_id, models.UserBlock.blocked_id).filter(
        or_(models.UserBlock.blocker_id == user_id, models.UserBlock.blocked_id == user_id),
    ).all()
    return {
        blocked_id if blocker_id == user_id else blocker_id
        for blocker_id, blocked_id in rows
    }


def _post_or_404(db: Session, post_id: int) -> models.SocialPost:
    post = db.query(models.SocialPost).options(
        joinedload(models.SocialPost.author).joinedload(models.User.profile),
    ).filter(models.SocialPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết")
    return post


def _friend_states(db: Session, user_id: int, peer_ids: set[int]) -> dict[int, str]:
    peer_ids.discard(user_id)
    if not peer_ids:
        return {}
    relationships = db.query(models.Friendship).filter(
        or_(
            (models.Friendship.user_low_id == user_id) & models.Friendship.user_high_id.in_(peer_ids),
            (models.Friendship.user_high_id == user_id) & models.Friendship.user_low_id.in_(peer_ids),
        )
    ).all()
    states = {}
    for item in relationships:
        peer_id = item.user_high_id if item.user_low_id == user_id else item.user_low_id
        states[peer_id] = {
            "status": "accepted" if item.status == "accepted" else (
                "outgoing" if item.requester_id == user_id else "incoming"
            ),
            "id": item.id,
        }
    return states


def _post_payloads(db: Session, posts: list[models.SocialPost], current_user_id: int):
    if not posts:
        return []
    post_ids = [post.id for post in posts]
    author_ids = {post.author_id for post in posts}
    likes = dict(db.query(
        models.SocialPostLike.post_id, func.count(models.SocialPostLike.id)
    ).filter(models.SocialPostLike.post_id.in_(post_ids)).group_by(models.SocialPostLike.post_id).all())
    comments = dict(db.query(
        models.SocialPostComment.post_id, func.count(models.SocialPostComment.id)
    ).filter(models.SocialPostComment.post_id.in_(post_ids)).group_by(models.SocialPostComment.post_id).all())
    liked_ids = {
        item[0] for item in db.query(models.SocialPostLike.post_id).filter(
            models.SocialPostLike.post_id.in_(post_ids),
            models.SocialPostLike.user_id == current_user_id,
        ).all()
    }
    friendship_states = _friend_states(db, current_user_id, author_ids)
    payloads = []
    for post in posts:
        profile = post.author.profile if post.author else None
        payloads.append({
            "id": post.id,
            "author_id": post.author_id,
            "author_name": display_name(post.author) if post.author else "Người dùng SportGo",
            "author_avatar_url": profile.avatar_url if profile else None,
            "author_owner_status": post.author.owner_status if post.author else "none",
            "author_is_premium": bool(post.author and post.author.is_premium),
            "friendship_status": friendship_states.get(post.author_id, {}).get("status", "none"),
            "friendship_id": friendship_states.get(post.author_id, {}).get("id"),
            "content": post.content,
            "media_url": post.media_url,
            "media_type": post.media_type,
            "like_count": likes.get(post.id, 0),
            "comment_count": comments.get(post.id, 0),
            "liked_by_me": post.id in liked_ids,
            "created_at": post.created_at,
            "updated_at": post.updated_at,
        })
    return payloads


def _comment_payload(
    comment: models.SocialPostComment,
    reply_count: int = 0,
    reaction_counts: Optional[dict[str, int]] = None,
    my_reaction: Optional[str] = None,
):
    author = comment.author
    profile = author.profile if author else None
    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "author_id": comment.author_id,
        "parent_id": comment.parent_id,
        "author_name": display_name(author) if author else "Người dùng SportGo",
        "author_avatar_url": profile.avatar_url if profile else None,
        "content": comment.content,
        "created_at": comment.created_at,
        "reply_count": reply_count,
        "reaction_counts": reaction_counts or {},
        "my_reaction": my_reaction,
    }


def _comments_payload(
    db: Session,
    comments: list[models.SocialPostComment],
    current_user_id: int,
):
    if not comments:
        return []
    comment_ids = [comment.id for comment in comments]
    reply_counts = dict(db.query(
        models.SocialPostComment.parent_id,
        func.count(models.SocialPostComment.id),
    ).filter(
        models.SocialPostComment.parent_id.in_(comment_ids),
    ).group_by(models.SocialPostComment.parent_id).all())
    reaction_counts = {}
    for comment_id, reaction, count in db.query(
        models.SocialPostCommentReaction.comment_id,
        models.SocialPostCommentReaction.reaction,
        func.count(models.SocialPostCommentReaction.id),
    ).filter(
        models.SocialPostCommentReaction.comment_id.in_(comment_ids),
    ).group_by(
        models.SocialPostCommentReaction.comment_id,
        models.SocialPostCommentReaction.reaction,
    ).all():
        reaction_counts.setdefault(comment_id, {})[reaction] = count
    my_reactions = dict(db.query(
        models.SocialPostCommentReaction.comment_id,
        models.SocialPostCommentReaction.reaction,
    ).filter(
        models.SocialPostCommentReaction.comment_id.in_(comment_ids),
        models.SocialPostCommentReaction.user_id == current_user_id,
    ).all())
    return [
        _comment_payload(
            comment,
            reply_count=reply_counts.get(comment.id, 0),
            reaction_counts=reaction_counts.get(comment.id, {}),
            my_reaction=my_reactions.get(comment.id),
        )
        for comment in comments
    ]


def _comment_reaction_payload(db: Session, comment_id: int, user_id: int):
    counts = dict(db.query(
        models.SocialPostCommentReaction.reaction,
        func.count(models.SocialPostCommentReaction.id),
    ).filter_by(comment_id=comment_id).group_by(
        models.SocialPostCommentReaction.reaction,
    ).all())
    my_reaction = db.query(models.SocialPostCommentReaction.reaction).filter_by(
        comment_id=comment_id,
        user_id=user_id,
    ).scalar()
    return {"comment_id": comment_id, "reaction_counts": counts, "my_reaction": my_reaction}


@router.get("", response_model=list[schemas.SocialPostResponse])
def list_social_posts(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None, min_length=2, max_length=80),
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    query = db.query(models.SocialPost).options(
        joinedload(models.SocialPost.author).joinedload(models.User.profile),
    )
    blocked_ids = _blocked_user_ids(db, current_user.id)
    if blocked_ids:
        query = query.filter(~models.SocialPost.author_id.in_(blocked_ids))
    if search and search.strip():
        term = search.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        query = query.join(models.SocialPost.author).outerjoin(
            models.UserProfile, models.UserProfile.user_id == models.User.id,
        ).filter(or_(
            models.SocialPost.content.ilike(f"%{term}%", escape="\\"),
            models.UserProfile.full_name.ilike(f"%{term}%", escape="\\"),
        ))
    posts = query.order_by(models.SocialPost.created_at.desc(), models.SocialPost.id.desc()).offset(offset).limit(limit).all()
    return _post_payloads(db, posts, current_user.id)


@router.get("/mine", response_model=list[schemas.SocialPostResponse])
def list_my_social_posts(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    posts = db.query(models.SocialPost).options(
        joinedload(models.SocialPost.author).joinedload(models.User.profile),
    ).filter(models.SocialPost.author_id == current_user.id).order_by(
        models.SocialPost.created_at.desc(), models.SocialPost.id.desc(),
    ).offset(offset).limit(limit).all()
    return _post_payloads(db, posts, current_user.id)


@router.get("/interactions", response_model=list[schemas.SocialPostInteractionResponse])
def get_social_post_interactions(
    ids: str = Query(..., min_length=1, max_length=500),
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    try:
        post_ids = list(dict.fromkeys(int(value) for value in ids.split(",") if value.strip()))
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Danh sách bài viết không hợp lệ") from error
    if not post_ids or len(post_ids) > 50 or any(post_id < 1 for post_id in post_ids):
        raise HTTPException(status_code=422, detail="Chỉ được đồng bộ từ 1 đến 50 bài viết")

    blocked_ids = _blocked_user_ids(db, current_user.id)
    posts_query = db.query(models.SocialPost.id).filter(models.SocialPost.id.in_(post_ids))
    if blocked_ids:
        posts_query = posts_query.filter(~models.SocialPost.author_id.in_(blocked_ids))
    allowed_ids = {post_id for (post_id,) in posts_query.all()}
    if not allowed_ids:
        return []

    like_counts = dict(db.query(
        models.SocialPostLike.post_id,
        func.count(models.SocialPostLike.id),
    ).filter(models.SocialPostLike.post_id.in_(allowed_ids)).group_by(models.SocialPostLike.post_id).all())
    comment_counts = dict(db.query(
        models.SocialPostComment.post_id,
        func.count(models.SocialPostComment.id),
    ).filter(models.SocialPostComment.post_id.in_(allowed_ids)).group_by(models.SocialPostComment.post_id).all())
    liked_ids = {
        post_id for (post_id,) in db.query(models.SocialPostLike.post_id).filter(
            models.SocialPostLike.post_id.in_(allowed_ids),
            models.SocialPostLike.user_id == current_user.id,
        ).all()
    }
    return [
        {
            "post_id": post_id,
            "like_count": like_counts.get(post_id, 0),
            "comment_count": comment_counts.get(post_id, 0),
            "liked_by_me": post_id in liked_ids,
        }
        for post_id in post_ids if post_id in allowed_ids
    ]


def _resolve_social_socket_posts(ticket: str, post_ids: list[int]):
    try:
        claims = jwt.decode(ticket, auth_utils.SECRET_KEY, algorithms=[auth_utils.ALGORITHM])
    except JWTError:
        return None, [], None
    if claims.get("purpose") != "social_ws" or not claims.get("sub"):
        return None, [], None

    with database.SessionLocal() as db:
        user = db.query(models.User).filter_by(email=claims["sub"], status="active").first()
        if not user:
            return None, [], None
        blocked_ids = _blocked_user_ids(db, user.id)
        posts_query = db.query(models.SocialPost.id).filter(models.SocialPost.id.in_(post_ids))
        if blocked_ids:
            posts_query = posts_query.filter(~models.SocialPost.author_id.in_(blocked_ids))
        return user.id, [post_id for (post_id,) in posts_query.all()], claims.get("jti")


@router.post("/realtime-ticket")
def create_social_realtime_ticket(
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    if not realtime_enabled():
        return {"enabled": False}
    ticket = auth_utils.create_access_token(
        {"sub": current_user.email, "purpose": "social_ws", "jti": uuid4().hex},
        expires_delta=timedelta(seconds=60),
    )
    return {"enabled": True, "ticket": ticket, "expires_in_seconds": 60}


@router.websocket("/realtime")
async def social_realtime_socket(websocket: WebSocket):
    if not realtime_enabled():
        await websocket.close(code=1013, reason="Realtime is not configured")
        return

    offered_protocols = [value.strip() for value in websocket.headers.get("sec-websocket-protocol", "").split(",")]
    if len(offered_protocols) != 2 or offered_protocols[0] != "sportgo.social.v1":
        await websocket.close(code=4401, reason="Missing websocket ticket")
        return
    ticket = offered_protocols[1]

    try:
        post_ids = list(dict.fromkeys(int(value) for value in websocket.query_params.get("post_ids", "").split(",") if value))
    except ValueError:
        await websocket.close(code=4400, reason="Invalid post ids")
        return
    if not post_ids or len(post_ids) > 50 or any(post_id < 1 for post_id in post_ids):
        await websocket.close(code=4400, reason="Subscribe to 1-50 posts")
        return

    user_id, allowed_post_ids, ticket_id = await run_in_threadpool(_resolve_social_socket_posts, ticket, post_ids)
    if user_id is None:
        await websocket.close(code=4401, reason="Invalid or expired websocket ticket")
        return
    try:
        ticket_consumed = bool(ticket_id and await consume_websocket_ticket(ticket_id))
    except Exception:
        logger.exception("Could not consume social websocket ticket")
        await websocket.close(code=1013, reason="Realtime temporarily unavailable")
        return
    if not ticket_consumed:
        await websocket.close(code=4401, reason="Websocket ticket already used")
        return
    if not allowed_post_ids:
        await websocket.close(code=4403, reason="No accessible posts")
        return

    try:
        redis_client = await get_async_client()
        pubsub = redis_client.pubsub()
        await pubsub.subscribe(*(f"social:post:{post_id}" for post_id in allowed_post_ids))
    except Exception:
        logger.exception("Could not subscribe social websocket user %s to Redis", user_id)
        await websocket.close(code=1013, reason="Realtime temporarily unavailable")
        return

    await websocket.accept(subprotocol="sportgo.social.v1")

    async def relay_events():
        async for message in pubsub.listen():
            if message and message.get("type") == "message":
                await websocket.send_text(message["data"])

    relay_task = asyncio.create_task(relay_events())
    receive_task = asyncio.create_task(websocket.receive_text())
    try:
        while True:
            done, _ = await asyncio.wait(
                {relay_task, receive_task},
                timeout=30,
                return_when=asyncio.FIRST_COMPLETED,
            )
            if relay_task in done:
                break
            if receive_task in done:
                # Browser clients send an application-level ping periodically.
                receive_task.result()
                receive_task = asyncio.create_task(websocket.receive_text())
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("Social websocket disconnected unexpectedly for user %s", user_id)
    finally:
        if not receive_task.done():
            receive_task.cancel()
        try:
            await receive_task
        except (asyncio.CancelledError, WebSocketDisconnect):
            pass
        if not relay_task.done():
            relay_task.cancel()
        try:
            await relay_task
        except asyncio.CancelledError:
            pass
        except Exception:
            logger.debug("Social realtime relay stopped", exc_info=True)
        try:
            await pubsub.unsubscribe()
            await pubsub.aclose()
        except Exception:
            logger.debug("Redis Pub/Sub cleanup failed", exc_info=True)
@router.post("", response_model=schemas.SocialPostResponse, status_code=status.HTTP_201_CREATED)
def create_social_post(
    data: schemas.SocialPostCreate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _ensure_interaction_allowed(current_user)
    _ensure_community_guidelines(db, current_user)
    post = models.SocialPost(author_id=current_user.id, **data.model_dump())
    db.add(post)
    db.commit()
    post = _post_or_404(db, post.id)
    return _post_payloads(db, [post], current_user.id)[0]


@router.put("/{post_id}", response_model=schemas.SocialPostResponse)
def update_social_post(
    post_id: int,
    data: schemas.SocialPostUpdate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _ensure_interaction_allowed(current_user)
    _ensure_community_guidelines(db, current_user)
    post = _post_or_404(db, post_id)
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Chỉ tác giả mới được chỉnh sửa bài viết")
    fields = data.model_dump(exclude_unset=True)
    content = fields.get("content", post.content)
    media_url = fields.get("media_url", post.media_url)
    media_type = fields.get("media_type", post.media_type)
    if not (content or "").strip() and not media_url:
        raise HTTPException(status_code=422, detail="Bài viết cần có nội dung hoặc ảnh/video")
    if bool(media_url) != bool(media_type):
        raise HTTPException(status_code=422, detail="Thông tin ảnh/video không hợp lệ")
    for key, value in fields.items():
        setattr(post, key, value.strip() if key == "content" and value else value)
    db.commit()
    post = _post_or_404(db, post_id)
    return _post_payloads(db, [post], current_user.id)[0]


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_social_post(
    post_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    post = _post_or_404(db, post_id)
    if not current_user.is_admin and post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Chỉ tác giả mới được xóa bài viết")
    db.delete(post)
    db.commit()
    publish_social_event(post_id, {
        "type": "post_deleted",
        "post_id": post_id,
        "actor_id": current_user.id,
    })
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{post_id}/like", response_model=schemas.SocialPostLikeResponse)
def like_social_post(
    post_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _ensure_interaction_allowed(current_user)
    _post_or_404(db, post_id)
    like = db.query(models.SocialPostLike).filter_by(post_id=post_id, user_id=current_user.id).first()
    if not like:
        db.add(models.SocialPostLike(post_id=post_id, user_id=current_user.id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
    like_count = db.query(func.count(models.SocialPostLike.id)).filter_by(post_id=post_id).scalar() or 0
    publish_social_event(post_id, {
        "type": "like_changed",
        "post_id": post_id,
        "actor_id": current_user.id,
        "liked": True,
        "like_count": like_count,
    })
    return {"liked": True, "like_count": like_count}


@router.delete("/{post_id}/like", response_model=schemas.SocialPostLikeResponse)
def unlike_social_post(
    post_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _ensure_interaction_allowed(current_user)
    _post_or_404(db, post_id)
    db.query(models.SocialPostLike).filter_by(post_id=post_id, user_id=current_user.id).delete(synchronize_session=False)
    db.commit()
    like_count = db.query(func.count(models.SocialPostLike.id)).filter_by(post_id=post_id).scalar() or 0
    publish_social_event(post_id, {
        "type": "like_changed",
        "post_id": post_id,
        "actor_id": current_user.id,
        "liked": False,
        "like_count": like_count,
    })
    return {"liked": False, "like_count": like_count}


@router.get("/{post_id}/comments", response_model=list[schemas.SocialPostCommentResponse])
def list_social_post_comments(
    post_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _post_or_404(db, post_id)
    comments = db.query(models.SocialPostComment).options(
        joinedload(models.SocialPostComment.author).joinedload(models.User.profile),
    ).filter(models.SocialPostComment.post_id == post_id).order_by(
        models.SocialPostComment.created_at.asc(), models.SocialPostComment.id.asc(),
    ).all()
    return _comments_payload(db, comments, current_user.id)


@router.get("/{post_id}/comments/page", response_model=schemas.SocialPostCommentPageResponse)
def list_social_post_comment_page(
    post_id: int,
    before_id: Optional[int] = Query(None, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _post_or_404(db, post_id)
    roots_query = db.query(models.SocialPostComment).options(
        joinedload(models.SocialPostComment.author).joinedload(models.User.profile),
    ).filter(
        models.SocialPostComment.post_id == post_id,
        models.SocialPostComment.parent_id.is_(None),
    )
    if before_id is not None:
        roots_query = roots_query.filter(models.SocialPostComment.id < before_id)
    root_page = roots_query.order_by(
        models.SocialPostComment.id.desc(),
    ).limit(limit + 1).all()
    has_more = len(root_page) > limit
    roots = root_page[:limit]
    root_ids = [root.id for root in roots]
    replies = []
    if root_ids:
        replies = db.query(models.SocialPostComment).options(
            joinedload(models.SocialPostComment.author).joinedload(models.User.profile),
        ).filter(
            models.SocialPostComment.post_id == post_id,
            models.SocialPostComment.parent_id.in_(root_ids),
        ).order_by(
            models.SocialPostComment.created_at.asc(),
            models.SocialPostComment.id.asc(),
        ).all()
    comments = sorted([*roots, *replies], key=lambda item: (item.created_at, item.id))
    total_count = db.query(func.count(models.SocialPostComment.id)).filter_by(post_id=post_id).scalar() or 0
    like_count = db.query(func.count(models.SocialPostLike.id)).filter_by(post_id=post_id).scalar() or 0
    liked_by_me = db.query(models.SocialPostLike.id).filter_by(
        post_id=post_id,
        user_id=current_user.id,
    ).first() is not None
    return {
        "items": _comments_payload(db, comments, current_user.id),
        "total_count": total_count,
        "has_more": has_more,
        "next_before_id": roots[-1].id if has_more and roots else None,
        "oldest_root_id": roots[-1].id if roots else None,
        "like_count": like_count,
        "liked_by_me": liked_by_me,
    }


@router.post("/{post_id}/comments", response_model=schemas.SocialPostCommentResponse, status_code=status.HTTP_201_CREATED)
def create_social_post_comment(
    post_id: int,
    data: schemas.SocialPostCommentCreate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _ensure_interaction_allowed(current_user)
    _ensure_community_guidelines(db, current_user)
    _post_or_404(db, post_id)
    parent_id = data.parent_id
    if parent_id is not None:
        parent = db.query(models.SocialPostComment).filter_by(id=parent_id, post_id=post_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Không tìm thấy bình luận cần trả lời")
        parent_id = parent.parent_id or parent.id
    comment = models.SocialPostComment(
        post_id=post_id,
        author_id=current_user.id,
        parent_id=parent_id,
        content=data.content,
    )
    db.add(comment)
    db.commit()
    comment = db.query(models.SocialPostComment).options(
        joinedload(models.SocialPostComment.author).joinedload(models.User.profile),
    ).filter(models.SocialPostComment.id == comment.id).first()
    payload = _comments_payload(db, [comment], current_user.id)[0]
    comment_count = db.query(func.count(models.SocialPostComment.id)).filter_by(post_id=post_id).scalar() or 0
    publish_social_event(post_id, {
        "type": "comment_created",
        "post_id": post_id,
        "actor_id": current_user.id,
        "comment": jsonable_encoder(payload),
        "comment_count": comment_count,
    })
    return payload


@router.put("/{post_id}/comments/{comment_id}", response_model=schemas.SocialPostCommentResponse)
def update_social_post_comment(
    post_id: int,
    comment_id: int,
    data: schemas.SocialPostCommentUpdate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _ensure_interaction_allowed(current_user)
    comment = db.query(models.SocialPostComment).filter_by(id=comment_id, post_id=post_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Không tìm thấy bình luận")
    if comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Chỉ chủ bình luận mới được chỉnh sửa")

    comment.content = data.content
    db.commit()
    comment = db.query(models.SocialPostComment).options(
        joinedload(models.SocialPostComment.author).joinedload(models.User.profile),
    ).filter_by(id=comment_id, post_id=post_id).first()
    payload = _comments_payload(db, [comment], current_user.id)[0]
    publish_social_event(post_id, {
        "type": "comment_updated",
        "post_id": post_id,
        "actor_id": current_user.id,
        "comment": jsonable_encoder(payload),
    })
    return payload


@router.put(
    "/{post_id}/comments/{comment_id}/reaction",
    response_model=schemas.SocialPostCommentReactionResponse,
)
def set_social_post_comment_reaction(
    post_id: int,
    comment_id: int,
    data: schemas.SocialPostCommentReactionCreate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _ensure_interaction_allowed(current_user)
    comment = db.query(models.SocialPostComment).filter_by(id=comment_id, post_id=post_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Không tìm thấy bình luận")
    reaction = db.query(models.SocialPostCommentReaction).filter_by(
        comment_id=comment_id,
        user_id=current_user.id,
    ).first()
    if reaction:
        reaction.reaction = data.reaction
    else:
        db.add(models.SocialPostCommentReaction(
            comment_id=comment_id,
            user_id=current_user.id,
            reaction=data.reaction,
        ))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        reaction = db.query(models.SocialPostCommentReaction).filter_by(
            comment_id=comment_id,
            user_id=current_user.id,
        ).first()
        if not reaction:
            raise HTTPException(status_code=409, detail="Không thể cập nhật cảm xúc")
        reaction.reaction = data.reaction
        db.commit()
    payload = _comment_reaction_payload(db, comment_id, current_user.id)
    publish_social_event(post_id, {
        "type": "comment_reaction_changed",
        "post_id": post_id,
        "actor_id": current_user.id,
        **payload,
    })
    return payload


@router.delete(
    "/{post_id}/comments/{comment_id}/reaction",
    response_model=schemas.SocialPostCommentReactionResponse,
)
def remove_social_post_comment_reaction(
    post_id: int,
    comment_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _ensure_interaction_allowed(current_user)
    comment = db.query(models.SocialPostComment).filter_by(id=comment_id, post_id=post_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Không tìm thấy bình luận")
    db.query(models.SocialPostCommentReaction).filter_by(
        comment_id=comment_id,
        user_id=current_user.id,
    ).delete(synchronize_session=False)
    db.commit()
    payload = _comment_reaction_payload(db, comment_id, current_user.id)
    publish_social_event(post_id, {
        "type": "comment_reaction_changed",
        "post_id": post_id,
        "actor_id": current_user.id,
        **payload,
    })
    return payload


@router.delete("/{post_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_social_post_comment(
    post_id: int,
    comment_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    comment = db.query(models.SocialPostComment).filter_by(id=comment_id, post_id=post_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Không tìm thấy bình luận")
    post = db.query(models.SocialPost.author_id).filter(models.SocialPost.id == post_id).scalar()
    if not current_user.is_admin and current_user.id not in {comment.author_id, post}:
        raise HTTPException(status_code=403, detail="Bạn không thể xóa bình luận này")
    comment_ids = [comment_id]
    if comment.parent_id is None:
        comment_ids.extend(
            child_id for (child_id,) in db.query(models.SocialPostComment.id).filter_by(parent_id=comment_id).all()
        )
    db.delete(comment)
    db.commit()
    comment_count = db.query(func.count(models.SocialPostComment.id)).filter_by(post_id=post_id).scalar() or 0
    publish_social_event(post_id, {
        "type": "comment_deleted",
        "post_id": post_id,
        "actor_id": current_user.id,
        "comment_ids": comment_ids,
        "comment_count": comment_count,
    })
    return Response(status_code=status.HTTP_204_NO_CONTENT)
