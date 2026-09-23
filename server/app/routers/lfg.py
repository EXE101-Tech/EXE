from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload, selectinload

from app import auth_utils, database, models, schemas

router = APIRouter(prefix="/lfg/posts", tags=["Forum & Find-a-game"])


def _post_payload(post: models.LfgPost, user_id: Optional[int] = None):
    author_name = post.author.profile.full_name if post.author and post.author.profile else None
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
            post.author_id == user_id or any(p.user_id == user_id for p in post.participants)
        )),
        "created_at": post.created_at,
    }


def _get_post_or_404(db: Session, post_id: int):
    post = db.query(models.LfgPost).options(
        joinedload(models.LfgPost.author).joinedload(models.User.profile),
        selectinload(models.LfgPost.participants),
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
    for key, value in fields.items():
        setattr(post, key, value)
    post.status = "FULL" if post.current_members >= post.total_members else "OPEN"
    db.commit()
    return _post_payload(_get_post_or_404(db, post.id), current_user.id)


@router.post("/{post_id}/join", response_model=schemas.LfgPostResponse)
def join_post(
    post_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    post = _get_post_or_404(db, post_id)
    if post.author_id == current_user.id:
        raise HTTPException(status_code=400, detail="Bạn không thể tham gia bài đăng của chính mình")
    if post.status != "OPEN":
        raise HTTPException(status_code=409, detail="Bài đăng không còn nhận người chơi")
    existing = db.query(models.LfgPostParticipant).filter_by(post_id=post.id, user_id=current_user.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Bạn đã gửi yêu cầu tham gia bài đăng này")
    post = db.query(models.LfgPost).filter(models.LfgPost.id == post_id).with_for_update().first()
    existing = db.query(models.LfgPostParticipant).filter_by(post_id=post.id, user_id=current_user.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Bạn đã gửi yêu cầu tham gia bài đăng này")
    if post.current_members >= post.total_members:
        post.status = "FULL"
        db.commit()
        raise HTTPException(status_code=409, detail="Bài đăng đã đủ người")
    db.add(models.LfgPostParticipant(post_id=post.id, user_id=current_user.id))
    post.current_members += 1
    if post.current_members >= post.total_members:
        post.status = "FULL"
    db.commit()
    return _post_payload(_get_post_or_404(db, post.id), current_user.id)


@router.delete("/{post_id}/membership", response_model=schemas.LfgPostResponse)
def leave_post(
    post_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    post = _get_post_or_404(db, post_id)
    if post.author_id == current_user.id:
        raise HTTPException(status_code=409, detail="Tác giả không thể rời bài đăng; hãy hủy bài đăng")
    participant = db.query(models.LfgPostParticipant).filter_by(post_id=post.id, user_id=current_user.id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Bạn chưa tham gia bài đăng này")
    db.delete(participant)
    post.current_members = max(1, post.current_members - 1)
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
    post = _get_post_or_404(db, post_id)
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Chỉ tác giả mới được hủy bài đăng")
    post.status = "CANCELLED"
    db.commit()
