"""Automatic invitations for Premium-hosted rooms that still need players."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session, joinedload, selectinload

from app import attendance, models, seat_holds
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
    if not match.start_time or match.start_time - now <= timedelta(minutes=30):
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
    db.flush()
    match = attendance.lock_room(db, match.id)
    if match.seat_holds_enabled:
        return _process_seat_offers(db, match)
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


def _process_seat_offers(db, match):
    stamp = attendance.now()
    expired = seat_holds.expire_room(db, match)
    if not _eligible_room(match, stamp):
        return expired
    missing = max(0, match.max_players - seat_holds.reserved_count(db, match))
    if not missing:
        return expired
    participants = db.query(models.MatchParticipant).filter_by(match_id=match.id).order_by(
        models.MatchParticipant.joined_at, models.MatchParticipant.id).all()
    waitlist = [p for p in participants if p.status == "WAITLISTED" and p.user.status == "active" and not p.user.is_admin]
    selected = waitlist[:missing]
    excluded = {p.user_id for p in participants}
    for user in _candidate_users(db, match, excluded):
        if len(selected) >= missing:
            break
        sport = db.query(models.UserSport).filter_by(user_id=user.id, sport_id=match.sport_id).first()
        if not sport or sport.skill_level != match.required_level:
            continue
        participant = models.MatchParticipant(match_id=match.id, user_id=user.id, role="PLAYER",
                                               status="PENDING", invite_source="AUTO", joined_at=stamp)
        db.add(participant)
        selected.append(participant)
    for p in selected:
        if p.status == "WAITLISTED":
            p.invite_source = "WAITLIST"
        p.status = "PENDING"
        p.invited_at = stamp
        p.response_deadline = seat_holds.offer_deadline(match, stamp)
        p.invite_round = (p.invite_round or 0) + 1
        attendance.event(db, match, None, "SEAT_OFFERED", p.user_id,
                         deadline=p.response_deadline.isoformat(), source=p.invite_source)
        seat_holds.notify(db, match, p.user_id, "gameroom_auto_invite", "Có suất chơi dành cho bạn",
                          f'“{match.title}” còn chỗ. Nhận chỗ và xác nhận trước '
                          f'{seat_holds.deadline_label(p.response_deadline)}. '
                          "Hết hạn sẽ chuyển lượt; không nhận lời mời không ảnh hưởng uy tín.")
    notified = 0
    last_change = db.query(models.MatchTrustEvent.id).filter(
        models.MatchTrustEvent.match_id == match.id,
        models.MatchTrustEvent.event_type.in_(("INVITE_ACCEPTED", "INVITE_EXPIRED", "SEAT_HOLD_EXPIRED",
                                              "CANCELLED_PARTICIPATION", "MEMBERSHIP_UPDATED", "ROOM_UPDATED")),
    ).order_by(models.MatchTrustEvent.id.desc()).first()
    vacancy = f"{last_change[0] if last_change else 0}:{missing}"
    if not selected and not db.query(models.MatchTrustEvent.id).filter_by(
        match_id=match.id, event_type="ROOM_NEEDS_PLAYERS").filter(
            models.MatchTrustEvent.details["vacancy"].as_string() == vacancy).first():
        attendance.event(db, match, None, "ROOM_NEEDS_PLAYERS", vacancy=vacancy)
        seat_holds.notify(db, match, match.host_id, "gameroom_needs_players", "Chưa tìm được người thay",
                          f'“{match.title}” còn {missing} suất trống. Chưa có người dự bị/người phù hợp để mời; '
                          "hãy kiểm tra và quyết định phương án cho buổi chơi.")
        notified = 1
    db.flush()
    return expired + len(selected) + notified


def process_auto_room_invites(db: Session) -> int:
    """Process Premium rooms, including expiring and rotating reserved offers."""
    now = _now_utc_naive()
    matches = db.query(models.Match).options(
        joinedload(models.Match.host).joinedload(models.User.profile),
        selectinload(models.Match.participants),
    ).filter(
        models.Match.status.in_(("OPEN", "FULL")),
        models.Match.start_time > now,
        models.Match.start_time < now + INVITE_WINDOW,
    ).order_by(models.Match.id).all()
    invited = sum(process_auto_room_invite_for_match(db, match) for match in matches)
    if invited or db.new or db.dirty:
        db.commit()
    return invited
