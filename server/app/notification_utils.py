from app import models


def create_notification(
    db,
    *,
    recipient_id: int,
    actor: models.User | None,
    notification_type: str,
    title: str,
    body: str,
    target_url: str | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
):
    if actor and actor.id == recipient_id:
        return None
    notification = models.Notification(
        recipient_id=recipient_id,
        actor_id=actor.id if actor else None,
        type=notification_type,
        title=title,
        body=body,
        target_url=target_url,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(notification)
    return notification


def display_name(user: models.User | None) -> str:
    if not user:
        return "Người chơi"
    profile = user.profile
    return (profile.full_name if profile and profile.full_name else user.email) or "Người chơi"
