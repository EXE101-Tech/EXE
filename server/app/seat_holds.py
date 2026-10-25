"""Disclosed seat deadlines. Callers serialize changes using the room row lock."""

from datetime import timedelta, timezone

from sqlalchemy import or_

from app import attendance, models
from app.cache import memory_cache
from app.notification_utils import create_notification


INVITE_SOURCES = ("AUTO", "WAITLIST")


def deadline_label(value):
    local = value.replace(tzinfo=timezone.utc).astimezone(timezone(timedelta(hours=7)))
    return local.strftime("%H:%M ngày %d/%m")


def notify(db, room, user_id, kind, title, body):
    create_notification(db, recipient_id=user_id, actor=None, notification_type=kind,
                        title=title, body=body, target_url=f"/matches?attendance={room.id}",
                        entity_type="game_room", entity_id=room.id)


def offer_deadline(room, stamp):
    return min(stamp + timedelta(minutes=15 if room.start_time - stamp > timedelta(hours=1) else 5), room.end_time)


def assign_hold(db, room, participant):
    if not room.seat_holds_enabled or participant.user_id == room.host_id or not participant.hold_policy_accepted:
        participant.response_deadline = None
        return
    stamp = attendance.now()
    participant.response_deadline = max(room.start_time - timedelta(hours=2), offer_deadline(room, stamp))
    participant.response_deadline = min(participant.response_deadline, room.end_time)
    attendance.event(db, room, room.host_id, "SEAT_HELD", participant.user_id,
                     deadline=participant.response_deadline.isoformat())
    notify(db, room, participant.user_id, "seat_held", "Xác nhận để giữ chỗ",
           f'Bạn đã được duyệt vào “{room.title}”. Xác nhận trước {deadline_label(participant.response_deadline)} '
           "để giữ chỗ. Hết hạn, suất sẽ mở lại; chưa xác nhận không bị tính bùng kèo.")


def reserved_count(db, room, excluding_user_id=None):
    stamp = attendance.now()
    rows = db.query(models.MatchParticipant).filter_by(match_id=room.id).all()
    return sum(1 for p in rows if p.user_id != excluding_user_id and (
        p.status == "APPROVED" or (p.status == "PENDING" and p.invite_source in INVITE_SOURCES
                                  and p.response_deadline and p.response_deadline > stamp)))


def expire_room(db, room):
    """Expiry is independent of current Premium entitlement; disclosed deadlines stay valid."""
    if room.status == "CANCELLED" or (room.trust_session and room.trust_session.removed_at):
        return 0
    stamp = attendance.now()
    changed = 0
    for p in db.query(models.MatchParticipant).filter(
        models.MatchParticipant.match_id == room.id,
        models.MatchParticipant.status.in_(("APPROVED", "PENDING")),
        models.MatchParticipant.response_deadline <= stamp,
    ).all():
        if p.user_id == room.host_id:
            continue
        record = db.query(models.MatchAttendanceRecord).filter_by(match_id=room.id, user_id=p.user_id).first()
        if p.status == "APPROVED" and record and record.confirmation_status == "CONFIRMED":
            p.response_deadline = None
            continue
        if p.status == "APPROVED" and not p.hold_policy_accepted:
            continue
        was_offer = p.status == "PENDING" and p.invite_source in INVITE_SOURCES
        if p.status == "PENDING" and not was_offer:
            continue
        p.status = "EXPIRED"
        if record and record.confirmation_status == "UNCONFIRMED":
            record.confirmation_status = "EXPIRED"
        attendance.event(db, room, None, "INVITE_EXPIRED" if was_offer else "SEAT_HOLD_EXPIRED", p.user_id,
                         deadline=p.response_deadline.isoformat())
        notify(db, room, p.user_id, "seat_hold_expired", "Đã hết hạn giữ chỗ",
               f'Suất trong “{room.title}” đã mở lại vì hết hạn nhận chỗ. Bạn không bị tính bùng kèo hoặc trừ uy tín.')
        changed += 1
    if changed:
        db.flush()
        if room.status in ("OPEN", "FULL"):
            count = db.query(models.MatchParticipant).filter_by(match_id=room.id, status="APPROVED").count()
            room.status = "FULL" if count >= room.max_players else "OPEN"
        notify(db, room, room.host_id, "seat_roster_changed", "Phòng có suất vừa mở lại",
               f'“{room.title}” có {changed} lượt giữ chỗ/lời mời hết hạn. Kiểm tra danh sách xác nhận và dự bị.')
    return changed


def _reminded(db, room, p, kind):
    return db.query(models.MatchTrustEvent.id).filter_by(
        match_id=room.id, subject_id=p.user_id, event_type=kind,
    ).filter(models.MatchTrustEvent.details["deadline"].as_string() == p.response_deadline.isoformat()).first()


def remind_room(db, room):
    stamp = attendance.now()
    if not room.seat_holds_enabled or not room.host.is_premium or room.status not in ("OPEN", "FULL") or stamp >= room.start_time:
        return 0
    sent = 0
    standard_deadline = room.start_time - timedelta(hours=2)
    if room.start_time - timedelta(hours=4) <= stamp < standard_deadline:
        final = stamp >= standard_deadline - timedelta(minutes=30)
        kind = "CONFIRMATION_FINAL_REMINDER" if final else "CONFIRMATION_REMINDER_4H"
        for p in db.query(models.MatchParticipant).filter_by(match_id=room.id, status="APPROVED").all():
            if p.response_deadline != standard_deadline or p.user_id == room.host_id or _reminded(db, room, p, kind):
                continue
            held = db.query(models.MatchTrustEvent).filter_by(
                match_id=room.id, subject_id=p.user_id, event_type="SEAT_HELD",
            ).order_by(models.MatchTrustEvent.id.desc()).first()
            scheduled = standard_deadline - timedelta(minutes=30) if final else room.start_time - timedelta(hours=4)
            if held and held.created_at >= scheduled:
                continue  # The approval notice already disclosed the deadline; do not replay a past reminder.
            record = db.query(models.MatchAttendanceRecord).filter_by(match_id=room.id, user_id=p.user_id).first()
            if record and record.confirmation_status == "CONFIRMED":
                continue
            attendance.event(db, room, None, kind, p.user_id, deadline=p.response_deadline.isoformat())
            notify(db, room, p.user_id, "seat_confirmation_reminder", "Nhắc lần cuối để giữ chỗ" if final else "Bạn sẽ đến buổi chơi chứ?",
                   f'Xác nhận tham gia “{room.title}” trước {deadline_label(p.response_deadline)}. '
                   "Nếu không thể đến, hãy hủy để nhường suất. Hết hạn chưa xác nhận, chỗ sẽ mở lại.")
            sent += 1
    if stamp >= standard_deadline and not db.query(models.MatchTrustEvent.id).filter_by(
        match_id=room.id, event_type="ROSTER_SUMMARY",
    ).filter(models.MatchTrustEvent.details["terms_version"].as_string() == room.terms_version).first():
        members = db.query(models.MatchParticipant).filter_by(match_id=room.id, status="APPROVED").all()
        confirmed = db.query(models.MatchAttendanceRecord).filter_by(match_id=room.id, confirmation_status="CONFIRMED").filter(
            models.MatchAttendanceRecord.user_id.in_([p.user_id for p in members])).count()
        attendance.event(db, room, None, "ROSTER_SUMMARY", terms_version=room.terms_version)
        notify(db, room, room.host_id, "seat_roster_summary", "Tình hình chốt kèo",
               f'“{room.title}”: {len(members)}/{room.max_players} chỗ đang giữ, {confirmed} người đã xác nhận. '
               f'Còn {max(0, room.max_players - len(members))} suất trống.')
        sent += 1
    return sent


def process_seat_holds(db):
    ids = db.query(models.Match.id).join(models.MatchTrustSession).outerjoin(models.MatchParticipant).filter(
        models.Match.status.in_(("OPEN", "FULL")),
        or_(models.MatchParticipant.response_deadline.isnot(None),
            models.MatchTrustSession.policy["seat_holds_enabled"].as_boolean().is_(True)),
    ).distinct().order_by(models.Match.id).all()
    changed = 0
    for (room_id,) in ids:
        room = attendance.lock_room(db, room_id)
        changed += expire_room(db, room)
        changed += remind_room(db, room)
    if changed:
        db.commit()
        memory_cache.delete_prefix("gamerooms:list:")
    return changed
