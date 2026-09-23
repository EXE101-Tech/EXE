from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload, selectinload

from app import auth_utils, database, models, schemas
from app.notification_utils import create_notification, display_name

router = APIRouter(prefix="/lfg/posts", tags=["Forum & Find-a-game"])


def _post_payload(post: models.LfgPost, user_id: Optional[int] = None):
    author_name = post.author.profile.full_name if post.author and post.author.profile else None
    participants = post.participants or []
    membership = next((participant for participant in participants if participant.user_id == user_id), None)
    approved_count = sum(participant.status == "APPROVED" for participant in participants)
    pending_count = sum(participant.status == "PENDING" for participant in participants)
    return {
        "id": post.id,
        "author_id": post.author_id,
        "author_name": author_name or (post.author.email if post.author else ""),
        "author_avatar_url": post.author.profile.avatar_url if post.author and post.author.profile else None,
        "sport_id": post.sport_id,
        "sport_name": post.sport_name,
        "title": post.title,
        "description": post.description,
        "location": post.location,
        "time_slot": post.time_slot,
        "date_label": post.date_label,
        "current_members": post.current_members,
        "total_members": post.total_members,
        "price": post.price,
        "skill_level": post.skill_level,
        "image_url": post.image_url,
        "status": post.status,
        "has_joined": bool(user_id is not None and (
            post.author_id == user_id or (membership and membership.status == "APPROVED")
        )),
        "membership_status": membership.status if membership else None,
        "pending_participants_count": pending_count,
        "approved_participants_count": approved_count,
        "created_at": post.created_at,
    }


def _get_post_or_404(db: Session, post_id: int):
    post = db.query(models.LfgPost).options(
        joinedload(models.LfgPost.author).joinedload(models.User.profile),
        selectinload(models.LfgPost.participants).joinedload(models.LfgPostParticipant.user).joinedload(models.User.profile),
    ).filter(
        models.LfgPost.id == post_id
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tìm người chơi")
    return post


@router.get("", response_model=List[schemas.LfgPostResponse])
def list_posts(
    sport_id: Optional[str] = None,
    location: Optional[str] = None,
    status_filter: str = Query("OPEN", alias="status", pattern="^(OPEN|FULL|CANCELLED|ALL)$"),
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    query = db.query(models.LfgPost).options(
        joinedload(models.LfgPost.author).joinedload(models.User.profile),
        selectinload(models.LfgPost.participants),
    )
    if sport_id:
        query = query.filter(models.LfgPost.sport_id == sport_id)
    if location:
        query = query.filter(models.LfgPost.location.ilike(f"%{location.strip()}%"))
    if status_filter != "ALL":
        query = query.filter(models.LfgPost.status == status_filter)
    posts = query.order_by(models.LfgPost.created_at.desc()).all()
    return [_post_payload(post, current_user.id) for post in posts]


@router.post("", response_model=schemas.LfgPostResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    data: schemas.LfgPostCreate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    fields = data.model_dump()
    # The author is always the first member; do not accept a client-supplied count.
    fields["current_members"] = 1
    post = models.LfgPost(
        author_id=current_user.id,
        status="FULL" if fields["current_members"] >= fields["total_members"] else "OPEN",
        **fields,
    )
    db.add(post)
    db.commit()
    return _post_payload(_get_post_or_404(db, post.id), current_user.id)


@router.get("/{post_id}", response_model=schemas.LfgPostResponse)
def get_post(
    post_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    return _post_payload(_get_post_or_404(db, post_id), current_user.id)


@router.put("/{post_id}", response_model=schemas.LfgPostResponse)
def update_post(
    post_id: int,
    data: schemas.LfgPostUpdate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    post = _get_post_or_404(db, post_id)
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Chỉ tác giả mới được chỉnh sửa bài đăng")
    if post.status == "CANCELLED":
        raise HTTPException(status_code=409, detail="Không thể chỉnh sửa bài đăng đã hủy")
    fields = data.model_dump(exclude_unset=True)
    next_total = fields.get("total_members", post.total_members)
    if next_total < post.current_members:
        raise HTTPException(status_code=400, detail="Tổng số người không được ít hơn số thành viên hiện tại")
    changed_fields = [key for key, value in fields.items() if getattr(post, key) != value]
    for key, value in fields.items():
        setattr(post, key, value)
    post.status = "FULL" if post.current_members >= post.total_members else "OPEN"
    if changed_fields:
        for participant in post.participants:
            if participant.status in {"PENDING", "APPROVED"}:
                create_notification(
                    db,
                    recipient_id=participant.user_id,
                    actor=current_user,
                    notification_type="lfg_post_updated",
                    title="Bài tìm người chơi đã được cập nhật",
                    body=f'{display_name(current_user)} đã cập nhật bài “{post.title}”.',
                    target_url="/tournaments",
                    entity_type="lfg_post",
                    entity_id=post.id,
                )
    db.commit()
    return _post_payload(_get_post_or_404(db, post.id), current_user.id)


@router.post("/{post_id}/join", response_model=schemas.LfgPostResponse)
def join_post(
    post_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    post_view = _get_post_or_404(db, post_id)
    if post_view.author_id == current_user.id:
        raise HTTPException(status_code=400, detail="Bạn không thể tham gia bài đăng của chính mình")
    post = db.query(models.LfgPost).filter(models.LfgPost.id == post_id).with_for_update().first()
    if not post or post.status == "CANCELLED":
        raise HTTPException(status_code=409, detail="Bài đăng không còn nhận người chơi")
    existing = db.query(models.LfgPostParticipant).filter_by(post_id=post.id, user_id=current_user.id).first()
    if existing and existing.status == "APPROVED":
        raise HTTPException(status_code=409, detail="Bạn đã tham gia bài đăng này")
    if existing and existing.status == "PENDING":
        raise HTTPException(status_code=409, detail="Bạn đã gửi yêu cầu tham gia bài đăng này")
    if post.current_members >= post.total_members:
        post.status = "FULL"
        db.commit()
        raise HTTPException(status_code=409, detail="Bài đăng đã đủ người")
    if existing:
        existing.status = "PENDING"
        existing.joined_at = models.utc_now_naive()
    else:
        existing = models.LfgPostParticipant(post_id=post.id, user_id=current_user.id, status="PENDING")
        db.add(existing)
    create_notification(
        db,
        recipient_id=post.author_id,
        actor=current_user,
        notification_type="lfg_join_request",
        title="Có yêu cầu tham gia mới",
        body=f'{display_name(current_user)} muốn tham gia bài “{post.title}”.',
        target_url="/tournaments",
        entity_type="lfg_post",
        entity_id=post.id,
    )
    post.status = "FULL" if post.current_members >= post.total_members else "OPEN"
    db.commit()
    return _post_payload(_get_post_or_404(db, post.id), current_user.id)


@router.get("/{post_id}/participants", response_model=List[schemas.LfgParticipantResponse])
def list_post_participants(
    post_id: int,
    status_filter: str = Query("PENDING", alias="status", pattern="^(PENDING|APPROVED|REJECTED)$"),
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    post = _get_post_or_404(db, post_id)
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Chỉ tác giả mới được kiểm duyệt người tham gia")
    participants = db.query(models.LfgPostParticipant).options(
        joinedload(models.LfgPostParticipant.user).joinedload(models.User.profile),
    ).filter(
        models.LfgPostParticipant.post_id == post.id,
        models.LfgPostParticipant.status == status_filter,
    ).order_by(
        models.LfgPostParticipant.joined_at.asc(), models.LfgPostParticipant.id.asc(),
    ).all()
    return [{
        "id": participant.id,
        "post_id": participant.post_id,
        "user_id": participant.user_id,
        "name": display_name(participant.user),
        "avatar_url": participant.user.profile.avatar_url if participant.user.profile else None,
        "status": participant.status,
        "joined_at": participant.joined_at,
    } for participant in participants]


@router.patch("/{post_id}/participants/{user_id}", response_model=schemas.LfgParticipantResponse)
def moderate_post_participant(
    post_id: int,
    user_id: int,
    data: schemas.LfgParticipantStatusUpdate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    post_view = _get_post_or_404(db, post_id)
    if post_view.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Chỉ tác giả mới được kiểm duyệt người tham gia")
    post = db.query(models.LfgPost).filter(models.LfgPost.id == post_id).with_for_update().first()
    if post.status == "CANCELLED":
        raise HTTPException(status_code=409, detail="Không thể kiểm duyệt người tham gia của bài đã hủy")
    # The post row is already locked, serializing capacity changes for this post.
    participant = db.query(models.LfgPostParticipant).options(
        joinedload(models.LfgPostParticipant.user).joinedload(models.User.profile),
    ).filter_by(post_id=post.id, user_id=user_id).first()
    if not participant or participant.status not in {"PENDING", "APPROVED"}:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu đang chờ hoặc thành viên")

    previous_status = participant.status
    next_status = data.status
    if next_status == previous_status:
        raise HTTPException(status_code=409, detail="Người tham gia đã ở trạng thái này")
    if next_status == "APPROVED" and previous_status == "PENDING":
        if post.current_members >= post.total_members:
            raise HTTPException(status_code=409, detail="Bài đăng đã đủ người; không thể chấp nhận thêm")
        post.current_members += 1
    elif next_status == "REJECTED" and previous_status == "APPROVED":
        post.current_members = max(1, post.current_members - 1)

    participant.status = next_status
    if post.status != "CANCELLED":
        post.status = "FULL" if post.current_members >= post.total_members else "OPEN"
    create_notification(
        db,
        recipient_id=participant.user_id,
        actor=current_user,
        notification_type="lfg_join_approved" if next_status == "APPROVED" else "lfg_join_rejected",
        title="Yêu cầu tham gia đã được xử lý",
        body=(
            f'{display_name(current_user)} đã chấp nhận bạn vào bài “{post.title}”.'
            if next_status == "APPROVED"
            else f'{display_name(current_user)} đã từ chối hoặc gỡ bạn khỏi bài “{post.title}”.'
        ),
        target_url="/tournaments",
        entity_type="lfg_post",
        entity_id=post.id,
    )
    db.commit()
    db.refresh(participant)
    return {
        "id": participant.id,
        "post_id": participant.post_id,
        "user_id": participant.user_id,
        "name": display_name(participant.user),
        "avatar_url": participant.user.profile.avatar_url if participant.user.profile else None,
        "status": participant.status,
        "joined_at": participant.joined_at,
    }


@router.delete("/{post_id}/membership", response_model=schemas.LfgPostResponse)
def leave_post(
    post_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    post_view = _get_post_or_404(db, post_id)
    if post_view.author_id == current_user.id:
        raise HTTPException(status_code=409, detail="Tác giả không thể rời bài đăng; hãy hủy bài đăng")
    post = db.query(models.LfgPost).filter(models.LfgPost.id == post_id).with_for_update().first()
    if not post or post.status == "CANCELLED":
        raise HTTPException(status_code=409, detail="Bài đăng không còn hoạt động")
    participant = db.query(models.LfgPostParticipant).filter_by(post_id=post.id, user_id=current_user.id).first()
    if not participant or participant.status not in {"PENDING", "APPROVED"}:
        raise HTTPException(status_code=404, detail="Bạn chưa tham gia bài đăng này")
    if participant.status == "APPROVED":
        post.current_members = max(1, post.current_members - 1)
    participant.status = "REJECTED"
    create_notification(
        db,
        recipient_id=post.author_id,
        actor=current_user,
        notification_type="lfg_participant_left",
        title="Người chơi đã rút khỏi bài đăng",
        body=f'{display_name(current_user)} đã rút khỏi bài “{post.title}”.',
        target_url="/tournaments",
        entity_type="lfg_post",
        entity_id=post.id,
    )
    if post.status == "FULL" and post.current_members < post.total_members:
        post.status = "OPEN"
    db.commit()
    return _post_payload(_get_post_or_404(db, post.id), current_user.id)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_post(
    post_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    post_view = _get_post_or_404(db, post_id)
    if post_view.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Chỉ tác giả mới được hủy bài đăng")
    post = db.query(models.LfgPost).filter(models.LfgPost.id == post_id).with_for_update().first()
    if post.status == "CANCELLED":
        raise HTTPException(status_code=409, detail="Bài đăng này đã được hủy trước đó")
    post.status = "CANCELLED"
    for participant in post.participants:
        if participant.status in {"PENDING", "APPROVED"}:
            create_notification(
                db,
                recipient_id=participant.user_id,
                actor=current_user,
                notification_type="lfg_post_cancelled",
                title="Bài tìm người chơi đã bị hủy",
                body=f'{display_name(current_user)} đã hủy bài “{post.title}”.',
                target_url="/tournaments",
                entity_type="lfg_post",
                entity_id=post.id,
            )
    db.commit()
