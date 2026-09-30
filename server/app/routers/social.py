from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app import auth_utils, database, models, schemas
from app.notification_utils import display_name

router = APIRouter(prefix="/social/posts", tags=["Social feed"])


def _ensure_interaction_allowed(current_user: models.User) -> None:
    if current_user.is_admin:
        raise HTTPException(status_code=403, detail="Tài khoản quản trị chỉ dùng để kiểm duyệt")


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


@router.post("", response_model=schemas.SocialPostResponse, status_code=status.HTTP_201_CREATED)
def create_social_post(
    data: schemas.SocialPostCreate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _ensure_interaction_allowed(current_user)
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


@router.post("/{post_id}/comments", response_model=schemas.SocialPostCommentResponse, status_code=status.HTTP_201_CREATED)
def create_social_post_comment(
    post_id: int,
    data: schemas.SocialPostCommentCreate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _ensure_interaction_allowed(current_user)
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
    return _comments_payload(db, [comment], current_user.id)[0]


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
    return _comments_payload(db, [comment], current_user.id)[0]


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
    return _comment_reaction_payload(db, comment_id, current_user.id)


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
    return _comment_reaction_payload(db, comment_id, current_user.id)


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
    db.delete(comment)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
