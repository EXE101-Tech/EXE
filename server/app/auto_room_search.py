from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app import models
from app.notification_utils import create_notification, display_name


# Vietnam uses UTC+07:00 year-round, so keep this self-contained for Windows
# environments that do not ship the optional IANA `tzdata` package.
LOCAL_TIMEZONE = timezone(timedelta(hours=7))


def _now_utc_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _room_price_vnd(price_info: Optional[str]) -> Optional[int]:
    if price_info is None:
        return None
    digits = "".join(character for character in str(price_info) if character.isdigit())
    return int(digits) if digits else None


def _location_matches(preferred: Optional[str], room_location: Optional[str]) -> bool:
    if not preferred:
        return True
    preferred_value = preferred.strip().casefold()
    room_value = (room_location or "").strip().casefold()
    return bool(room_value) and (preferred_value in room_value or room_value in preferred_value)


def _start_time_slot(match: models.Match) -> tuple[int, str]:
    # Match timestamps are persisted as UTC-naive values by MatchCreate.
    local_start = match.start_time.replace(tzinfo=timezone.utc).astimezone(LOCAL_TIMEZONE)
    rounded_minutes = (local_start.minute // 30) * 30
    return local_start.weekday(), f"{local_start.hour:02d}:{rounded_minutes:02d}"


def preference_matches_match(preference: models.RoomSearchPreference, match: models.Match) -> bool:
    if not preference.is_active:
        return False
    if preference.sport_id and preference.sport_id != match.sport_id:
        return False
    if preference.required_level and preference.required_level != match.required_level:
        return False
    if not _location_matches(preference.location, match.location):
        return False

    room_price = _room_price_vnd(match.price_info)
    if preference.max_price is not None and (room_price is None or room_price > preference.max_price):
        return False

    selected_slots = {
        (int(item.get("weekday")), item.get("time"))
        for item in (preference.time_slots or [])
        if isinstance(item, dict) and item.get("weekday") is not None and item.get("time")
    }
    if selected_slots:
        if _start_time_slot(match) not in selected_slots:
            return False
    return True


def _already_notified(db: Session, recipient_id: int, match_id: int) -> bool:
    return db.query(models.Notification.id).filter(
        models.Notification.recipient_id == recipient_id,
        models.Notification.type == "gameroom_auto_match",
        models.Notification.entity_type == "game_room",
        models.Notification.entity_id == match_id,
    ).first() is not None


def _notify_preference_for_match(
    db: Session,
    preference: models.RoomSearchPreference,
    match: models.Match,
    actor: Optional[models.User] = None,
) -> bool:
    if not preference.user_id or preference.user_id == match.host_id or _already_notified(db, preference.user_id, match.id):
        return False
    host_name = display_name(actor) if actor else "Một người chơi"
    create_notification(
        db,
        recipient_id=preference.user_id,
        actor=actor,
        notification_type="gameroom_auto_match",
        title="Có phòng chơi phù hợp với bạn",
        body=f'{host_name} vừa mở phòng “{match.title}” phù hợp với thiết lập tự động của bạn.',
        target_url="/matches",
        entity_type="game_room",
        entity_id=match.id,
    )
    return True


def notify_matching_users_for_match(
    db: Session,
    match: models.Match,
    actor: Optional[models.User] = None,
) -> int:
    """Notify active Premium users whose saved setup matches a newly opened room."""
    now = _now_utc_naive()
    preferences = db.query(models.RoomSearchPreference).options(
        joinedload(models.RoomSearchPreference.user),
    ).join(models.RoomSearchPreference.user).filter(
        models.RoomSearchPreference.is_active.is_(True),
        models.User.premium_until > now,
        models.RoomSearchPreference.user_id != match.host_id,
    ).all()
    notified = 0
    for preference in preferences:
        if preference_matches_match(preference, match):
            notified += int(_notify_preference_for_match(db, preference, match, actor))
    return notified


def notify_matches_for_preference(
    db: Session,
    preference: models.RoomSearchPreference,
    actor: Optional[models.User] = None,
) -> int:
    """Backfill notifications for currently open rooms when a setup is saved."""
    now = _now_utc_naive()
    matches = db.query(models.Match).filter(
        models.Match.host_id != preference.user_id,
        models.Match.status.notin_(["CLOSED", "CANCELLED", "FINISHED"]),
        models.Match.end_time > now,
    ).order_by(models.Match.created_at.desc()).all()
    notified = 0
    for match in matches:
        if preference_matches_match(preference, match):
            notified += int(_notify_preference_for_match(db, preference, match, actor))
    return notified
