"""Evidence-based attendance. Mutations lock the room; callers own the transaction."""

import hashlib
import hmac
import json
import os
import secrets
from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import joinedload

from app import models
from app.notification_utils import create_notification, display_name


CHECKIN_CODE_TTL_MINUTES = 1


def now():
    return models.utc_now_naive()


def _setting(name, default, minimum, maximum):
    try:
        return max(minimum, min(maximum, int(os.getenv(name, default))))
    except ValueError:
        return default


def default_policy():
    return {
        "version": "attendance-v3",
        "late_cancel_minutes": _setting("ATTENDANCE_LATE_CANCEL_MINUTES", 120, 0, 1440),
        "confirm_after_start_minutes": _setting("ATTENDANCE_CONFIRM_AFTER_START_MINUTES", 30, 0, 120),
        "checkin_before_minutes": _setting("ATTENDANCE_CHECKIN_BEFORE_MINUTES", 30, 0, 120),
        "code_ttl_minutes": CHECKIN_CODE_TTL_MINUTES,
        "required_witnesses": _setting("ATTENDANCE_REQUIRED_WITNESSES", 1, 1, 10),
        "required_peer_confirmations": 2,
        "two_person_peer_confirmations": 1,
        "allow_supplemental_attendance": True,
        "minimum_samples": _setting("REPUTATION_MINIMUM_SAMPLES", 5, 1, 100),
        "window_days": 180,
        "score_formula": "100 * verified_attended / (verified_attended + reviewed_no_shows)",
    }


def lock_room(db, match_id):
    room = db.query(models.Match).filter_by(id=match_id).populate_existing().with_for_update().first()
    if not room:
        raise HTTPException(404, "Không tìm thấy phòng chơi")
    return room


def session_for(db, room):
    session = db.query(models.MatchTrustSession).filter_by(match_id=room.id).first()
    if session is None:
        session = models.MatchTrustSession(
            match_id=room.id, organizer_id=room.host_id, policy=default_policy(),
            verification_status="UNVERIFIED",
        )
        db.add(session)
        db.flush()
        room.trust_session = session
    return session


def record_for(db, room, user_id):
    record = db.query(models.MatchAttendanceRecord).filter_by(match_id=room.id, user_id=user_id).first()
    if record is None:
        record = models.MatchAttendanceRecord(match_id=room.id, user_id=user_id, confirmation_status="UNCONFIRMED")
        db.add(record)
        db.flush()
    return record


def event(db, room, actor_id, kind, subject_id=None, **details):
    db.add(models.MatchTrustEvent(
        match_id=room.id, actor_id=actor_id, subject_id=subject_id,
        event_type=kind, details=details, created_at=now(),
    ))


def require_participant(db, room, user_id, approved=False):
    query = db.query(models.MatchParticipant).filter_by(match_id=room.id, user_id=user_id)
    if approved:
        query = query.filter_by(status="APPROVED")
    participant = query.first()
    if participant is None:
        raise HTTPException(403, "Bạn không có quyền thực hiện thao tác trong phòng này")
    return participant


def _terms(room, policy):
    return {
        "policy": policy, "start_time": room.start_time.isoformat(), "end_time": room.end_time.isoformat(),
        "location": room.location, "price_info": room.price_info, "sport_id": room.sport_id,
        "court_id": room.court_id,
    }


def terms_version(room, policy):
    return hashlib.sha256(json.dumps(_terms(room, policy), sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def _available(room, session):
    if room.status == "CANCELLED" or session.removed_at:
        raise HTTPException(409, "Buổi chơi đã bị hủy hoặc gỡ")


def confirmation_deadline(room, policy):
    return min(room.start_time + timedelta(minutes=policy.get("confirm_after_start_minutes", 30)), room.end_time)


def confirm(db, room, user, accepted_terms_version=None):
    require_participant(db, room, user.id, approved=True)
    session = session_for(db, room)
    _available(room, session)
    if accepted_terms_version and accepted_terms_version != terms_version(room, session.policy):
        raise HTTPException(409, "Lịch hoặc điều kiện đã thay đổi. Hãy đọc lại thông tin mới rồi xác nhận")
    record = record_for(db, room, user.id)
    if record.confirmation_status == "CONFIRMED":
        return record
    if now() >= confirmation_deadline(room, session.policy):
        raise HTTPException(409, "Đã hết hạn xác nhận tham gia; không ghi nhận cam kết hồi tố")
    if record.confirmation_status != "CONFIRMED":
        record.confirmation_status = "CONFIRMED"
        record.confirmed_at = now()
        record.terms = _terms(room, session.policy)
        record.cancelled_at = None
        record.cancellation_reason = None
        record.late_cancellation = False
        event(db, room, user.id, "CONFIRMED", user.id, terms=record.terms)
    return record


def cancel_commitment(db, room, user_id, reason, actor_id=None):
    """Keep the participant and history, even when no commitment was made."""
    session = session_for(db, room)
    record = record_for(db, room, user_id)
    if record.confirmation_status in ("CANCELLED", "DECLINED"):
        return record
    stamp = now()
    had_commitment = record.confirmed_at is not None and record.confirmation_status == "CONFIRMED"
    record.confirmation_status = ("REMOVED" if actor_id not in (None, user_id)
                                  else "CANCELLED" if had_commitment else "DECLINED")
    record.cancelled_at = stamp
    record.cancellation_reason = reason
    # An organizer removing somebody is not a cancellation made by the player.
    record.late_cancellation = bool(
        had_commitment and actor_id in (None, user_id)
        and room.status != "CANCELLED"
        and stamp > room.start_time - timedelta(minutes=session.policy["late_cancel_minutes"])
    )
    event(db, room, actor_id or user_id, "CANCELLED_PARTICIPATION", user_id,
          reason=reason, had_commitment=had_commitment, late=record.late_cancellation,
          status_before=db.query(models.MatchParticipant.status).filter_by(match_id=room.id, user_id=user_id).scalar())
    return record


def reset_after_rejoin(db, room, user_id):
    record = db.query(models.MatchAttendanceRecord).filter_by(match_id=room.id, user_id=user_id).first()
    if record:
        record.confirmation_status = "UNCONFIRMED"
        record.confirmed_at = None
        record.terms = None
        record.checked_in_at = None
        record.cancelled_at = None
        record.cancellation_reason = None
        record.late_cancellation = False
    event(db, room, user_id, "JOIN_REQUESTED", user_id)


def invalidate_commitments(db, room, actor_id, recorded_update=False):
    """Changed date/location/cost requires fresh consent; never backdate consent."""
    session = session_for(db, room)
    session.policy = {key: value for key, value in session.policy.items() if key != "peer_roster_size"}
    records = db.query(models.MatchAttendanceRecord).filter_by(match_id=room.id).all()
    for record in records:
        if record.confirmation_status == "CONFIRMED":
            event(db, room, actor_id, "TERMS_CHANGED", record.user_id, previous_terms=record.terms,
                  room_update=recorded_update)
            record.confirmation_status = "UNCONFIRMED"
            record.confirmed_at = None
            record.terms = None
            record.checked_in_at = None
            create_notification(db, recipient_id=record.user_id, actor=None,
                                notification_type="attendance_terms_changed", title="Lịch chơi đã thay đổi",
                                body=f'Vui lòng đọc lịch mới và xác nhận lại phòng “{room.title}”.',
                                target_url=f"/matches?attendance={room.id}", entity_type="game_room", entity_id=room.id)
        if record.confirmation_status == "UNCONFIRMED":
            # A supplemental report must not become evidence for a rescheduled session.
            for field in ("checked_in_at", "self_occurred", "self_attended", "self_reported_at", "host_report",
                          "host_reported_at", "dispute_reason", "dispute_at", "resolved_outcome",
                          "resolution_note", "reviewed_by", "reviewed_at"):
                setattr(record, field, None)
    session.code_hash = None
    session.code_expires_at = None
    session.verification_status = "UNVERIFIED"
    session.reviewed_status = None
    session.reviewed_at = None


def cancel_room(db, room, actor_id, removed=False):
    session = session_for(db, room)
    if removed and session.removed_at:
        return
    # Removing a past room must not rewrite a real session as cancelled.
    if now() < room.end_time:
        room.status = "CANCELLED"
        session.verification_status = "CANCELLED"
        session.cancelled_by = actor_id
    if removed:
        session.removed_at = now()
    session.code_hash = None
    session.code_expires_at = None
    event(db, room, actor_id, "ROOM_REMOVED" if removed else "ROOM_CANCELLED",
          occurred_before_end=now() < room.end_time)


def _in_checkin_window(room, policy):
    return room.start_time - timedelta(minutes=policy["checkin_before_minutes"]) <= now() < room.end_time


def open_checkin(db, room, user):
    if room.host_id != user.id:
        raise HTTPException(403, "Chỉ chủ phòng mới mở được mã check-in")
    session = session_for(db, room)
    _available(room, session)
    if not _in_checkin_window(room, session.policy):
        raise HTTPException(409, "Chưa tới giờ check-in hoặc buổi chơi đã kết thúc")
    record = record_for(db, room, user.id)
    if record.confirmation_status != "CONFIRMED":
        raise HTTPException(409, "Hãy xác nhận tham gia trước khi mở check-in")
    while True:
        code = f"{secrets.randbelow(1_000_000):06d}"
        previous_digest = hashlib.sha256(f"{session.code_salt}:{code}".encode()).hexdigest()
        if not session.code_hash or not hmac.compare_digest(previous_digest, session.code_hash):
            break
    salt = secrets.token_hex(24)
    session.code_hash = hashlib.sha256(f"{salt}:{code}".encode()).hexdigest()
    session.code_salt = salt
    session.code_expires_at = min(now() + timedelta(minutes=CHECKIN_CODE_TTL_MINUTES), room.end_time)
    record.checked_in_at = record.checked_in_at or now()
    event(db, room, user.id, "CHECKIN_OPENED", user.id, expires_at=session.code_expires_at.isoformat())
    return {"code": code, "expires_at": session.code_expires_at}


def check_in(db, room, user, code):
    require_participant(db, room, user.id, approved=True)
    session = session_for(db, room)
    _available(room, session)
    record = record_for(db, room, user.id)
    if record.confirmation_status != "CONFIRMED":
        raise HTTPException(409, "Hãy xác nhận tham gia trước khi check-in")
    if record.checked_in_at:
        return record
    if record.locked_until and record.locked_until > now():
        raise HTTPException(429, "Bạn nhập sai nhiều lần. Hãy thử lại sau 5 phút")
    if not _in_checkin_window(room, session.policy) or not session.code_expires_at or session.code_expires_at <= now():
        raise HTTPException(409, "Mã check-in chưa mở hoặc đã hết hạn")
    digest = hashlib.sha256(f"{session.code_salt}:{code}".encode()).hexdigest()
    if not session.code_hash or not hmac.compare_digest(digest, session.code_hash):
        record.failed_attempts = (record.failed_attempts or 0) + 1
        if record.failed_attempts >= 5:
            record.locked_until = now() + timedelta(minutes=5)
            record.failed_attempts = 0
        # Persist failed attempts even though the HTTP response is an error.
        db.commit()
        raise HTTPException(400, "Mã check-in không đúng")
    record.checked_in_at = now()
    record.failed_attempts = 0
    record.locked_until = None
    event(db, room, user.id, "CHECKED_IN", user.id)
    return record


def refresh_verification(db, room):
    session = session_for(db, room)
    db.flush()
    records = db.query(models.MatchAttendanceRecord).filter_by(match_id=room.id).all()
    if room.status == "CANCELLED":
        session.verification_status = "CANCELLED"
        return
    approved_ids = {p.user_id for p in db.query(models.MatchParticipant).filter_by(match_id=room.id, status="APPROVED")}
    reports = [r for r in records if r.user_id in approved_ids and r.self_occurred is not None
               and r.confirmation_status in ("CONFIRMED", "UNCONFIRMED")]
    if session.reviewed_status and not any(
        r.self_reported_at and r.self_reported_at > session.reviewed_at for r in reports
    ):
        session.verification_status = session.reviewed_status
        return
    values = {r.self_occurred for r in reports}
    host = next((r for r in reports if r.user_id == room.host_id), None)
    witnesses = [r for r in reports if r.user_id != room.host_id]
    peers = peer_evidence(db, [room.id])[room.id]
    def cross_confirmed(record):
        return len(peers["confirmations"].get(record.user_id, [])) >= peers["required"]
    if len(values) > 1:
        session.verification_status = "DISPUTED"
    elif host and host.self_occurred is False and witnesses:
        session.verification_status = "CANCELLED"
    elif host and host.self_occurred and host.self_attended and (
        (host.checked_in_at and len([r for r in witnesses if r.self_attended and r.checked_in_at])
         >= session.policy["required_witnesses"])
        or (cross_confirmed(host) and len([r for r in witnesses if r.self_attended and cross_confirmed(r)])
            >= session.policy["required_witnesses"])
    ):
        session.verification_status = "OCCURRED"
    else:
        session.verification_status = "UNVERIFIED"


def _after_end(room):
    if now() < room.end_time:
        raise HTTPException(409, "Chỉ ghi nhận kết quả sau khi buổi chơi kết thúc")


def report_self(db, room, user, occurred, attended):
    require_participant(db, room, user.id, approved=True)
    _after_end(room)
    if room.status == "CANCELLED":
        raise HTTPException(409, "Buổi chơi đã bị hủy")
    _snapshot_peer_roster(db, room)
    record = record_for(db, room, user.id)
    if record.confirmation_status not in ("CONFIRMED", "UNCONFIRMED"):
        raise HTTPException(409, "Bạn không còn tham gia phòng này")
    if record.reviewed_at:
        raise HTTPException(409, "Kết quả đã được kiểm duyệt. Hãy gửi phản hồi nếu cần xem lại")
    if record.self_occurred == occurred and record.self_attended == attended:
        return record
    record.self_occurred, record.self_attended = occurred, attended
    record.self_reported_at = now()
    event(db, room, user.id, "SELF_REPORTED", user.id, occurred=occurred, attended=attended,
          supplemental=bool(attended and (not record.confirmed_at or not record.checked_in_at)))
    refresh_verification(db, room)
    return record


def report_host(db, room, user, user_id, attendance):
    if room.host_id != user.id:
        raise HTTPException(403, "Chỉ chủ phòng mới ghi nhận điểm danh")
    _after_end(room)
    if room.status == "CANCELLED":
        raise HTTPException(409, "Buổi chơi đã bị hủy")
    _snapshot_peer_roster(db, room)
    participant = require_participant(db, room, user_id, approved=True)
    record = record_for(db, room, user_id)
    if record.reviewed_at:
        raise HTTPException(409, "Kết quả đã kiểm duyệt; gửi phản hồi để được xem lại")
    if record.host_report != attendance:
        record.host_report = attendance
        record.host_reported_at = now()
        # This legacy field remains a host report, never sufficient for reputation.
        participant.attendance_status = attendance
        event(db, room, user.id, "HOST_REPORTED", user_id, attendance=attendance)
        create_notification(db, recipient_id=user_id, actor=user,
                            notification_type="attendance_reported", title="Chủ phòng đã ghi nhận điểm danh",
                            body=f'Kiểm tra và phản hồi kết quả của bạn tại “{room.title}”.',
                            target_url=f"/matches?attendance={room.id}", entity_type="game_room", entity_id=room.id)
    return participant


def _evidence_signature(record):
    return {
        "confirmed_at": record.confirmed_at.isoformat() if record.confirmed_at else None,
        "terms": hashlib.sha256(json.dumps(record.terms, sort_keys=True, ensure_ascii=False).encode()).hexdigest(),
    }


def _can_witness(record):
    return bool(record and record.confirmation_status in ("CONFIRMED", "UNCONFIRMED") and record.self_reported_at
                and record.self_reported_at >= max([stamp for stamp in (record.confirmed_at, record.checked_in_at)
                                                   if stamp], default=record.self_reported_at)
                and record.self_occurred is True and record.self_attended is True
                and not is_disputed(record))


def _can_receive_peer(record):
    return bool(record and record.confirmation_status in ("CONFIRMED", "UNCONFIRMED")
                and (record.confirmed_at or (record.self_occurred is True and record.self_attended is True)))


def _snapshot_peer_roster(db, room):
    session = session_for(db, room)
    if "peer_roster_size" not in session.policy:
        count = db.query(models.MatchParticipant).filter_by(match_id=room.id, status="APPROVED").count()
        session.policy = {**session.policy, "peer_roster_size": count}
        db.flush()


def peer_evidence(db, match_ids):
    """Project latest distinct peer votes from durable audit, independent of the 50-event UI limit."""
    match_ids = set(match_ids)
    if not match_ids:
        return {}
    members = db.query(models.MatchParticipant).filter(
        models.MatchParticipant.match_id.in_(match_ids), models.MatchParticipant.status == "APPROVED",
    ).options(joinedload(models.MatchParticipant.user).joinedload(models.User.profile)).all()
    records = {(r.match_id, r.user_id): r for r in db.query(models.MatchAttendanceRecord).filter(
        models.MatchAttendanceRecord.match_id.in_(match_ids)).all()}
    policies = {s.match_id: s.policy for s in db.query(models.MatchTrustSession).filter(
        models.MatchTrustSession.match_id.in_(match_ids)).all()}
    room_terms = {room.id: terms_version(room, {}) for room in db.query(models.Match).filter(
        models.Match.id.in_(match_ids)).all()}
    result = {mid: {"members": {}, "required": 2, "confirmations": {}, "votes": {}} for mid in match_ids}
    for member in members:
        result[member.match_id]["members"][member.user_id] = display_name(member.user)
    for mid, context in result.items():
        size = policies.get(mid, {}).get("peer_roster_size", len(context["members"]))
        context["required"] = 1 if size == 2 else 2
    seen = set()
    votes = db.query(models.MatchTrustEvent).filter(
        models.MatchTrustEvent.match_id.in_(match_ids), models.MatchTrustEvent.event_type == "PEER_REPORTED",
    ).order_by(models.MatchTrustEvent.id.desc()).all()
    for vote in votes:
        key = (vote.match_id, vote.actor_id, vote.subject_id)
        if key in seen:
            continue
        seen.add(key)
        context = result[vote.match_id]
        witness = records.get((vote.match_id, vote.actor_id))
        subject = records.get((vote.match_id, vote.subject_id))
        details = vote.details or {}
        if (vote.actor_id == vote.subject_id or vote.actor_id not in context["members"]
                or vote.subject_id not in context["members"] or not witness or not subject
                or ("room_terms" in details and details["room_terms"] != room_terms.get(vote.match_id))
                or details.get("witness") != _evidence_signature(witness)
                or details.get("subject") != _evidence_signature(subject)
                or details.get("witness_reported_at") != (witness.self_reported_at.isoformat() if witness.self_reported_at else None)):
            continue
        context["votes"][(vote.actor_id, vote.subject_id)] = bool(details.get("attended"))
        if details.get("attended") and _can_witness(witness) and _can_receive_peer(subject):
            context["confirmations"].setdefault(vote.subject_id, []).append({
                "user_id": vote.actor_id, "name": context["members"][vote.actor_id],
            })
    return result


def report_peer(db, room, user, user_id, attended):
    require_participant(db, room, user.id, approved=True)
    require_participant(db, room, user_id, approved=True)
    _after_end(room)
    if room.status == "CANCELLED":
        raise HTTPException(409, "Buổi chơi đã bị hủy")
    if user.id == user_id:
        raise HTTPException(422, "Không thể tự xác nhận có mặt cho chính mình")
    witness = record_for(db, room, user.id)
    subject = record_for(db, room, user_id)
    if not _can_witness(witness):
        raise HTTPException(409, "Hãy gửi phản hồi bạn đã có mặt tại buổi chơi trước khi xác nhận người khác")
    if not _can_receive_peer(subject):
        raise HTTPException(409, "Người này cần khai báo đã tham gia buổi chơi trước khi được xác nhận bổ sung")
    if subject.reviewed_at:
        raise HTTPException(409, "Kết quả đã được kiểm duyệt. Hãy yêu cầu xem lại nếu cần thay đổi")
    _snapshot_peer_roster(db, room)
    db.flush()
    context = peer_evidence(db, [room.id])[room.id]
    if context["votes"].get((user.id, user_id), False) == attended:
        return subject
    event(db, room, user.id, "PEER_REPORTED", user_id, attended=attended,
          witness=_evidence_signature(witness), subject=_evidence_signature(subject),
          witness_reported_at=witness.self_reported_at.isoformat(), room_terms=terms_version(room, {}))
    refresh_verification(db, room)
    return subject


def dispute(db, room, user, reason):
    require_participant(db, room, user.id)
    _after_end(room)
    record = record_for(db, room, user.id)
    if record.dispute_reason == reason and is_disputed(record):
        return record
    record.dispute_reason, record.dispute_at = reason, now()
    event(db, room, user.id, "DISPUTED", user.id, reason=reason)
    refresh_verification(db, room)
    return record


def is_disputed(record):
    latest = max([t for t in (record.dispute_at, record.host_reported_at, record.self_reported_at) if t], default=None)
    if record.reviewed_at and (latest is None or record.reviewed_at >= latest):
        return False
    return bool(record.dispute_reason or (
        record.host_report is not None and record.self_attended is not None
        and (record.host_report == "ATTENDED") != record.self_attended
    ))


def outcome(record, session, peers):
    if session is None or session.verification_status != "OCCURRED" or is_disputed(record):
        return "UNVERIFIED"
    if record.resolved_outcome and record.reviewed_at:
        return record.resolved_outcome
    if (record.confirmation_status in ("CONFIRMED", "UNCONFIRMED")
            and record.self_occurred is True and record.self_attended is True
            and len(peers.get("confirmations", {}).get(record.user_id, [])) >= peers.get("required", 2)):
        return "ATTENDED"
    return "UNVERIFIED"


def review(db, room, admin, user_id, data):
    _after_end(room)
    record = db.query(models.MatchAttendanceRecord).filter_by(match_id=room.id, user_id=user_id).first()
    if not record:
        raise HTTPException(404, "Không tìm thấy hồ sơ điểm danh")
    session = session_for(db, room)
    previous_status = session.verification_status
    if data.session_status:
        if room.status == "CANCELLED" and data.session_status == "OCCURRED":
            raise HTTPException(409, "Không thể xác nhận diễn ra cho phòng đã hủy")
        session.reviewed_status = data.session_status
        session.reviewed_at = now()
    refresh_verification(db, room)
    if data.outcome == "NO_SHOW" and (
        not record.confirmed_at or session.verification_status != "OCCURRED"
        or record.confirmation_status != "CONFIRMED" or record.checked_in_at
    ):
        raise HTTPException(409, "Chỉ ghi nhận bùng kèo khi đã cam kết, buổi đã xác minh và không có check-in")
    if data.outcome == "ATTENDED" and session.verification_status != "OCCURRED":
        raise HTTPException(409, "Cần xác minh buổi chơi trước khi ghi nhận tham dự")
    # Repeated review of an identical decision must not duplicate audit/notifications.
    if (record.resolved_outcome == data.outcome and record.resolution_note == data.note
            and record.reviewed_at and not is_disputed(record) and previous_status == session.verification_status):
        return record
    record.resolved_outcome, record.resolution_note = data.outcome, data.note
    record.reviewed_by, record.reviewed_at = admin.id, now()
    event(db, room, admin.id, "ADMIN_REVIEWED", user_id,
          outcome=data.outcome, note=data.note, session_status=session.verification_status)
    create_notification(db, recipient_id=user_id, actor=admin,
                        notification_type="attendance_reviewed", title="Phản hồi điểm danh đã được xử lý",
                        body=f'Kết quả tại “{room.title}” đã được kiểm duyệt. Bạn có thể xem lý do trong buổi chơi.',
                        target_url=f"/matches?attendance={room.id}", entity_type="game_room", entity_id=room.id)
    return record


def reputations(db, user_ids):
    user_ids = set(user_ids)
    if not user_ids:
        return {}
    policy = default_policy()
    cutoff = now() - timedelta(days=policy["window_days"])
    records = db.query(models.MatchAttendanceRecord).join(models.Match).filter(
        models.MatchAttendanceRecord.user_id.in_(user_ids), models.Match.end_time >= cutoff,
        models.Match.end_time <= now(),
    ).options(joinedload(models.MatchAttendanceRecord.match).joinedload(models.Match.trust_session)).all()
    hosted = db.query(models.MatchTrustSession).filter(
        ((models.MatchTrustSession.organizer_id.in_(user_ids)) | (models.MatchTrustSession.cancelled_by.in_(user_ids))),
        models.MatchTrustSession.created_at >= cutoff,
    ).all()
    summaries = {uid: {
        "score": None, "verified_attended": 0, "verified_committed_attendance": 0,
        "supplemental_attended": 0, "reviewed_no_shows": 0,
        "late_cancellations": 0, "early_cancellations": 0, "pending_reviews": 0,
        "sample_count": 0, "eligible_commitments": 0, "verified_attendance_rate": None, "no_show_rate": None,
        "minimum_samples": policy["minimum_samples"], "window_days": policy["window_days"],
        "hosted_sessions": 0, "cancelled_hosted_sessions": 0, "games_by_sport": {}, "version": policy["version"],
        "explanation": "Điểm = tỷ lệ tham dự đã xác minh trong các buổi tham dự hoặc bùng kèo đã kiểm duyệt, trong 180 ngày. Hủy tham gia được hiển thị riêng.",
    } for uid in user_ids}
    evidence = peer_evidence(db, {record.match_id for record in records})
    verified_commitments = {uid: 0 for uid in user_ids}
    for record in records:
        summary = summaries[record.user_id]
        session = record.match.trust_session
        state = outcome(record, session, evidence[record.match_id])
        if (session and session.verification_status == "OCCURRED" and record.confirmed_at
                and (record.confirmation_status == "CONFIRMED" or state == "ATTENDED")
                and not is_disputed(record) and state != "EXCUSED"):
            summary["eligible_commitments"] += 1
        if state == "ATTENDED":
            summary["verified_attended"] += 1
            if record.confirmed_at:
                verified_commitments[record.user_id] += 1
            if not record.confirmed_at or not record.checked_in_at:
                summary["supplemental_attended"] += 1
            sport_id = record.match.sport_id
            summary["games_by_sport"][sport_id] = summary["games_by_sport"].get(sport_id, 0) + 1
        elif state == "NO_SHOW":
            summary["reviewed_no_shows"] += 1
        if is_disputed(record) or (record.host_report == "ABSENT" and record.confirmed_at and not record.reviewed_at):
            summary["pending_reviews"] += 1
    cancellations = db.query(models.MatchTrustEvent).join(models.Match).join(models.MatchTrustSession).filter(
        models.MatchTrustEvent.subject_id.in_(user_ids), models.MatchTrustEvent.event_type == "CANCELLED_PARTICIPATION",
        models.MatchTrustEvent.created_at >= cutoff, models.MatchTrustEvent.created_at <= now(),
        models.MatchTrustSession.verification_status != "CANCELLED",
    ).all()
    for cancellation in cancellations:
        if cancellation.actor_id == cancellation.subject_id and cancellation.details.get("had_commitment"):
            summaries[cancellation.subject_id]["late_cancellations" if cancellation.details.get("late") else "early_cancellations"] += 1
    for session in hosted:
        if session.organizer_id in summaries:
            summaries[session.organizer_id]["hosted_sessions"] += 1
        if session.verification_status == "CANCELLED" and session.cancelled_by in summaries:
            summaries[session.cancelled_by]["cancelled_hosted_sessions"] += 1
    for uid, summary in summaries.items():
        summary["verified_committed_attendance"] = verified_commitments[uid]
        summary["sample_count"] = summary["verified_attended"] + summary["reviewed_no_shows"]
        if summary["eligible_commitments"]:
            summary["verified_attendance_rate"] = round(100 * verified_commitments[uid] / summary["eligible_commitments"], 1)
            summary["no_show_rate"] = round(100 * summary["reviewed_no_shows"] / summary["eligible_commitments"], 1)
        if summary["sample_count"] >= summary["minimum_samples"]:
            summary["score"] = round(100 * summary["verified_attended"] / summary["sample_count"])
    return summaries


def attach_reputations(db, rooms):
    users = {}
    for room in rooms:
        users[room.host.id] = room.host
        for participant in room.participants:
            users[participant.user.id] = participant.user
    summaries = reputations(db, users)
    for uid, user in users.items():
        user.reputation = {key: value for key, value in summaries[uid].items() if key != "pending_reviews"}
    return rooms


def verified_games_by_sport(db, user_id):
    """Activity totals are lifetime counts; the reputation window stays independent."""
    records = db.query(models.MatchAttendanceRecord).join(models.Match).filter(
        models.MatchAttendanceRecord.user_id == user_id, models.Match.end_time <= now(),
    ).options(joinedload(models.MatchAttendanceRecord.match).joinedload(models.Match.trust_session)).all()
    counts = {}
    evidence = peer_evidence(db, {record.match_id for record in records})
    for record in records:
        if outcome(record, record.match.trust_session, evidence[record.match_id]) == "ATTENDED":
            sport_id = record.match.sport_id
            counts[sport_id] = counts.get(sport_id, 0) + 1
    return counts


def _record_payload(record, participant, session, peers, viewer_id):
    return {
        "user_id": participant.user_id, "name": display_name(participant.user),
        "membership_status": participant.status, "role": participant.role,
        "confirmation_status": record.confirmation_status if record else "UNCONFIRMED",
        "confirmed_at": record.confirmed_at if record else None,
        "cancelled_at": record.cancelled_at if record else None,
        "cancellation_reason": record.cancellation_reason if record else None,
        "late_cancellation": bool(record and record.late_cancellation),
        "checked_in_at": record.checked_in_at if record else None,
        "host_report": record.host_report if record else None,
        "self_occurred": record.self_occurred if record else None,
        "self_attended": record.self_attended if record else None,
        "dispute_reason": record.dispute_reason if record else None,
        "disputed": bool(record and is_disputed(record)),
        "resolved_outcome": record.resolved_outcome if record else None,
        "resolution_note": record.resolution_note if record else None,
        "outcome": outcome(record, session, peers) if record else "UNVERIFIED",
        "has_commitment": bool(record and record.confirmed_at),
        "peer_confirmations": peers["confirmations"].get(participant.user_id, []),
        "required_peer_confirmations": peers["required"],
        "my_peer_confirmation": peers["votes"].get((viewer_id, participant.user_id), False),
        "can_receive_peer_confirmation": _can_receive_peer(record),
        "supplemental_attendance": bool(record and record.self_attended and (not record.confirmed_at or not record.checked_in_at)),
    }


def room_state(db, room, user):
    if not user.is_admin:
        require_participant(db, room, user.id)
    session = db.query(models.MatchTrustSession).filter_by(match_id=room.id).first()
    policy = session.policy if session else default_policy()
    records = {r.user_id: r for r in db.query(models.MatchAttendanceRecord).filter_by(match_id=room.id).all()}
    participants = db.query(models.MatchParticipant).filter_by(match_id=room.id).options(
        joinedload(models.MatchParticipant.user).joinedload(models.User.profile),
    ).all()
    mine_participant = next((p for p in participants if p.user_id == user.id), None)
    peers = peer_evidence(db, [room.id])[room.id]
    mine = _record_payload(records.get(user.id), mine_participant, session, peers, user.id) if mine_participant else None
    can_manage = room.host_id == user.id or user.is_admin
    can_see_peers = bool(can_manage or (mine_participant and mine_participant.status == "APPROVED" and now() >= room.end_time))
    current = [p for p in participants if p.status == "APPROVED"]
    room_events = ("ROOM_CREATED", "ROOM_UPDATED", "HOST_TRANSFERRED", "ROOM_CANCELLED", "ROOM_REMOVED")
    event_model = models.MatchTrustEvent
    # Operational rotations must not displace meaningful activities from the latest 50.
    events = db.query(event_model).filter_by(match_id=room.id).filter(
        event_model.event_type != "CHECKIN_OPENED",
        or_(event_model.event_type != "TERMS_CHANGED", event_model.details["room_update"].as_boolean().isnot(True)),
    )
    if not user.is_admin:
        visible_ids = [p.user_id for p in current] if can_see_peers else [user.id]
        events = events.filter(or_(event_model.subject_id.in_(visible_ids), event_model.event_type.in_(room_events)))
    recent_events = events.order_by(event_model.id.desc()).limit(50).all()
    user_ids = {uid for e in recent_events for uid in (e.actor_id, e.subject_id) if uid is not None}
    names = {person.id: display_name(person) for person in db.query(models.User).options(
        joinedload(models.User.profile)).filter(models.User.id.in_(user_ids)).all()} if user_ids else {}
    audit = [{"id": e.id, "type": e.event_type, "actor_id": e.actor_id,
              "actor_name": names.get(e.actor_id, "Tài khoản đã xóa") if e.actor_id else "Hệ thống",
              "subject_id": e.subject_id, "subject_name": names.get(e.subject_id, "Tài khoản đã xóa"),
              "details": e.details or {}, "created_at": e.created_at}
             for e in recent_events]
    return {
        "match_id": room.id, "title": room.title, "host_id": room.host_id,
        "server_time": now(),
        "status": room.status, "removed": bool(session and session.removed_at),
        "start_time": room.start_time, "end_time": room.end_time,
        "location": room.location, "price_info": room.price_info,
        "verification_status": session.verification_status if session else "UNVERIFIED",
        "policy": {**policy, "code_ttl_minutes": CHECKIN_CODE_TTL_MINUTES,
                   "required_peer_confirmations": 2, "two_person_peer_confirmations": 1,
                   "allow_supplemental_attendance": True}, "mine": mine,
        "terms_version": terms_version(room, policy),
        "confirmation_deadline": confirmation_deadline(room, policy),
        "can_manage": can_manage, "can_review": bool(user.is_admin),
        "can_peer_confirm": bool(not user.is_admin and mine_participant and mine_participant.status == "APPROVED"
                                 and now() >= room.end_time and room.status != "CANCELLED"
                                 and _can_witness(records.get(user.id))),
        "checkin_available": _in_checkin_window(room, policy) and room.status != "CANCELLED" and not (session and session.removed_at),
        "code_expires_at": session.code_expires_at if session else None,
        "participants": [_record_payload(records.get(p.user_id), p, session, peers, user.id) for p in current] if can_see_peers else [],
        "review_participants": [_record_payload(records.get(p.user_id), p, session, peers, user.id) for p in participants
                                if p.user_id in records] if user.is_admin else [],
        "events": audit,
    }
