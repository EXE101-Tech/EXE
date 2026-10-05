"""Automatic invitations for Premium-hosted rooms that still need players."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session, joinedload, selectinload

from app import models
from app.notification_utils import create_notification, display_name


INVITE_INTERVAL = timedelta(minutes=30)
INVITE_WINDOW = timedelta(hours=4)


def _now_utc_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _normalise_area(value: Optional[str]) -> str:
    return " ".join((value or "").casefold().split())


def _eligible_room(match: models.Match, now: datetime) -> bool:
    if not match.host or not match.host.is_premium or match.status != "OPEN":
        return False
    if not match.start_time or match.start_time <= now:
        return False
    return match.start_time - now < INVITE_WINDOW


def _candidate_users(db: Session, match: models.Match, excluded_ids: set[int]):
    host_area = _normalise_area(getattr(match.host.profile, "district", None))
    if not host_area:
        # A room without an activity area must not send invitations to an
        # arbitrary district. The host can add it from their profile.
        return []

    query = db.query(models.UserSport).options(
        joinedload(models.UserSport.user).joinedload(models.User.profile),
    ).join(models.UserSport.user).filter(
        models.UserSport.sport_id == match.sport_id,
        models.User.id != match.host_id,
        models.User.status == "active",
        models.User.is_admin.is_(False),
    )
    candidates = []
    for user_sport in query.order_by(
        models.UserSport.games_played.desc(),
        models.UserSport.rating.desc(),
        models.UserSport.user_id.asc(),
    ).all():
        user = user_sport.user
        if not user or user.id in excluded_ids:
            continue
        profile_area = _normalise_area(getattr(user.profile, "district", None))
        if profile_area != host_area:
            continue
        candidates.append(user)
    return candidates


def process_auto_room_invite_for_match(db: Session, match: models.Match) -> int:
    """Invite the next batch for one eligible room.

    The first pass invites all currently missing players. Each later pass waits
    30 minutes from the latest automatic invitation and adds one candidate.
    Existing participant rows are never reused, so a declined invitation is not
    sent to the same user again.
    """
    now = _now_utc_naive()
    if not _eligible_room(match, now):
        return 0

    approved_count = sum(
        1 for participant in (match.participants or [])
        if participant.status == "APPROVED"
    )
    missing = max(0, (match.max_players or 0) - approved_count)
    if missing <= 0:
        return 0

    auto_participants = [
        participant for participant in (match.participants or [])
        if participant.invite_source == "AUTO"
    ]
    latest = max(auto_participants, key=lambda item: item.invited_at or item.joined_at or now, default=None)
    if latest is not None:
        last_invited_at = latest.invited_at or latest.joined_at or now
        if now - last_invited_at < INVITE_INTERVAL:
            return 0
        invite_count = 1
        invite_round = max((item.invite_round or 1 for item in auto_participants), default=1) + 1
    else:
        invite_count = missing
        invite_round = 1

    excluded_ids = {participant.user_id for participant in (match.participants or [])}
    candidates = _candidate_users(db, match, excluded_ids)[:invite_count]
    if not candidates:
        return 0

    host_name = display_name(match.host)
    invited = 0
    for candidate in candidates:
        participant = models.MatchParticipant(
            match_id=match.id,
            user_id=candidate.id,
            role="PLAYER",
            status="PENDING",
            invite_source="AUTO",
            invited_at=now,
            invite_round=invite_round,
            note="Lời mời tự động từ phòng Premium",
        )
        db.add(participant)
        create_notification(
            db,
            recipient_id=candidate.id,
            actor=match.host,
            notification_type="gameroom_auto_invite",
            title="Bạn được mời vào phòng chơi",
            body=(
                f'{host_name} mời bạn vào phòng “{match.title}” trong khu vực hoạt động của bạn. '
                "Vui lòng phản hồi trong 30 phút."
            ),
            target_url="/matches",
            entity_type="game_room",
            entity_id=match.id,
        )
        invited += 1
    return invited


def process_auto_room_invites(db: Session) -> int:
    """Process all Premium rooms eligible for the current 30-minute cycle."""
    now = _now_utc_naive()
    matches = db.query(models.Match).options(
        joinedload(models.Match.host).joinedload(models.User.profile),
        selectinload(models.Match.participants),
    ).filter(
        models.Match.status == "OPEN",
        models.Match.start_time > now,
        models.Match.start_time < now + INVITE_WINDOW,
    ).all()
    invited = sum(process_auto_room_invite_for_match(db, match) for match in matches)
    if invited:
        db.commit()
    return invited
