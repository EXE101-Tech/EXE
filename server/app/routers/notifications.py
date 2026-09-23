from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app import auth_utils, database, models, schemas

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _payload(item: models.Notification):
    actor = item.actor
    profile = actor.profile if actor else None
    return {
        "id": item.id,
        "type": item.type,
        "title": item.title,
        "body": item.body,
        "target_url": item.target_url,
        "entity_type": item.entity_type,
        "entity_id": item.entity_id,
        "is_read": item.is_read,
        "created_at": item.created_at,
        "actor": ({
            "id": actor.id,
            "name": (profile.full_name if profile and profile.full_name else actor.email),
            "avatar_url": profile.avatar_url if profile else None,
        } if actor else None),
    }


@router.get("", response_model=schemas.NotificationListResponse)
def list_notifications(
    limit: int = Query(20, ge=1, le=50),
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    items = db.query(models.Notification).options(
        joinedload(models.Notification.actor).joinedload(models.User.profile),
    ).filter(
        models.Notification.recipient_id == current_user.id,
    ).order_by(
        models.Notification.created_at.desc(), models.Notification.id.desc(),
    ).limit(limit).all()
    unread_count = db.query(func.count(models.Notification.id)).filter(
        models.Notification.recipient_id == current_user.id,
        models.Notification.is_read.is_(False),
    ).scalar() or 0
    return {"items": [_payload(item) for item in items], "unread_count": unread_count}


@router.patch("/{notification_id}/read", response_model=schemas.NotificationResponse)
def mark_notification_read(
    notification_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    item = db.query(models.Notification).options(
        joinedload(models.Notification.actor).joinedload(models.User.profile),
    ).filter(
        models.Notification.id == notification_id,
        models.Notification.recipient_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo")
    item.is_read = True
    db.commit()
    db.refresh(item)
    return _payload(item)


@router.post("/read-all", status_code=204)
def mark_all_notifications_read(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    db.query(models.Notification).filter(
        models.Notification.recipient_id == current_user.id,
        models.Notification.is_read.is_(False),
    ).update({models.Notification.is_read: True}, synchronize_session=False)
    db.commit()
