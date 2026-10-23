from sqlalchemy.orm import Session, joinedload, selectinload
from fastapi import HTTPException
from app import models, schemas, attendance

def _match_eager_options():
    return [
        joinedload(models.Match.host).joinedload(models.User.profile),
        joinedload(models.Match.sport),
        joinedload(models.Match.trust_session),
        joinedload(models.Match.court).joinedload(models.Court.venue),
        joinedload(models.Match.court).joinedload(models.Court.sport),
        selectinload(models.Match.participants).joinedload(models.MatchParticipant.user).joinedload(models.User.profile),
    ]

def create_match(db: Session, host_id: int, match: schemas.MatchCreate):
    db_match = models.Match(
        host_id=host_id,
        sport_id=match.sport_id,
        court_id=match.court_id,
        title=match.title,
        description=match.description,
        location=match.location,
        price_info=match.price_info,
        required_level=match.required_level,
        start_time=match.start_time,
        end_time=match.end_time,
        max_players=match.max_players,
        status="OPEN"
    )
    db.add(db_match)
    db.flush()
    
    # Host automatically joins the match and is APPROVED
    db_host_participant = models.MatchParticipant(
        match_id=db_match.id,
        user_id=host_id,
        role="HOST",
        status="APPROVED"
    )
    db.add(db_host_participant)
    attendance.session_for(db, db_match)
    attendance.event(db, db_match, host_id, "ROOM_CREATED", host_id)
    db.commit()
    db.refresh(db_match)
    return db_match

def close_expired_matches(db: Session):
    now = attendance.now()
    updated = db.query(models.Match).filter(
        models.Match.end_time <= now,
        models.Match.status.notin_(["CLOSED", "CANCELLED", "FINISHED"]),
    ).update({models.Match.status: "CLOSED"}, synchronize_session="fetch")
    expired_requests = attendance.expire_join_requests(db)
    if updated or expired_requests:
        db.commit()
    return updated + expired_requests


def get_matches(db: Session, sport_id: int = None, status: str = None, host_id: int = None):
    query = db.query(models.Match).options(*_match_eager_options())
    if host_id is not None:
        query = query.filter(models.Match.host_id == host_id)
    else:
        now = attendance.now()
        query = query.filter(
            models.Match.status.notin_(["CLOSED", "CANCELLED", "FINISHED"]),
            models.Match.end_time > now,
        )
    if sport_id:
        query = query.filter(models.Match.sport_id == sport_id)
    if status:
        query = query.filter(models.Match.status == status)
    return attendance.attach_reputations(db, query.order_by(models.Match.created_at.desc()).all())


def update_match(db: Session, match_id: int, data: schemas.MatchCreate):
    match = attendance.lock_room(db, match_id)
    if not match:
        return None
    changed_fields = [field for field in (
        "start_time", "end_time", "location", "price_info", "sport_id", "court_id",
    ) if getattr(match, field) != getattr(data, field)]
    if changed_fields:
        def value_for_history(value):
            return value.isoformat() if hasattr(value, "isoformat") else value
        changes = {field: {"before": value_for_history(getattr(match, field)),
                           "after": value_for_history(getattr(data, field))} for field in changed_fields}
        attendance.event(db, match, match.host_id, "ROOM_UPDATED", changes=changes)
        attendance.invalidate_commitments(db, match, match.host_id, recorded_update=True)
    for field in (
        "title", "description", "location", "price_info", "sport_id", "court_id",
        "required_level", "start_time", "end_time", "max_players",
    ):
        setattr(match, field, getattr(data, field))
    approved_count = db.query(models.MatchParticipant).filter(
        models.MatchParticipant.match_id == match_id,
        models.MatchParticipant.status == "APPROVED",
    ).count()
    match.status = "FULL" if approved_count >= match.max_players else "OPEN"
    db.commit()
    return get_match_by_id(db, match_id)

def get_match_by_id(db: Session, match_id: int):
    return db.query(models.Match).options(*_match_eager_options()).filter(models.Match.id == match_id).first()

def join_match(db: Session, match_id: int, user_id: int, note: str = None):
    room = attendance.lock_room(db, match_id)
    exists = db.query(models.MatchParticipant).filter(
        models.MatchParticipant.match_id == match_id,
        models.MatchParticipant.user_id == user_id
    ).first()
    if exists:
        if exists.status == "REJECTED":
            exists.status = "PENDING"
            exists.role = "PLAYER"
            exists.note = note
            # A manual re-join starts a regular host approval request rather
            # than reviving the previous automatic invitation cycle.
            exists.invite_source = None
            exists.invited_at = None
            exists.invite_round = None
            exists.joined_at = models.utc_now_naive()
            attendance.reset_after_rejoin(db, room, user_id)
            db.commit()
            db.refresh(exists)
        return exists
        
    db_participant = models.MatchParticipant(
        match_id=match_id,
        user_id=user_id,
        role="PLAYER",
        status="PENDING",  # Default status is PENDING to support approval flow
        note=note,
    )
    db.add(db_participant)
    attendance.event(db, room, user_id, "JOIN_REQUESTED", user_id)
    db.commit()
    return db_participant

def leave_match(db: Session, match_id: int, user_id: int, reason: str = "Người chơi rời phòng"):
    match = attendance.lock_room(db, match_id)
    if match.end_time <= attendance.now():
        raise HTTPException(409, "Buổi đã kết thúc. Hãy phản hồi điểm danh thay vì rời phòng")
    db_participant = db.query(models.MatchParticipant).filter(
        models.MatchParticipant.match_id == match_id,
        models.MatchParticipant.user_id == user_id
    ).first()
    if db_participant and db_participant.status != "REJECTED":
        is_host = db_participant.role == "HOST"
        attendance.cancel_commitment(db, match, user_id, reason)
        db_participant.status = "REJECTED"
        db_participant.role = "PLAYER"
        db.flush()
        if is_host:
            # Find another participant to transfer host to
            next_host = db.query(models.MatchParticipant).filter(
                models.MatchParticipant.match_id == match_id,
                models.MatchParticipant.status == "APPROVED",
                models.MatchParticipant.user_id != user_id
            ).order_by(models.MatchParticipant.joined_at.asc()).first()
            
            if next_host:
                next_host.role = "HOST"
                match.host_id = next_host.user_id
                attendance.event(db, match, user_id, "HOST_TRANSFERRED", next_host.user_id)
            else:
                attendance.cancel_room(db, match, user_id)
        if match.status not in ("CANCELLED", "CLOSED", "FINISHED"):
            approved_count = db.query(models.MatchParticipant).filter(
                models.MatchParticipant.match_id == match_id,
                models.MatchParticipant.status == "APPROVED"
            ).count()
            match.status = "FULL" if approved_count >= match.max_players else "OPEN"
                
        db.commit()
        return True
    return False

def update_match_participant_status(db: Session, match_id: int, user_id: int, status: str):
    match = attendance.lock_room(db, match_id)
    participant = db.query(models.MatchParticipant).filter(
        models.MatchParticipant.match_id == match_id,
        models.MatchParticipant.user_id == user_id
    ).first()
    if not participant:
        return None
        
    if participant.status == status:
        return participant

    if match.end_time <= attendance.now():
        raise HTTPException(409, "Buổi đã kết thúc. Hãy phản hồi điểm danh thay vì thay đổi thành viên")

    previous_status = participant.status
        
    if status == "APPROVED":
        other_approved = db.query(models.MatchParticipant).filter(
            models.MatchParticipant.match_id == match_id,
            models.MatchParticipant.status == "APPROVED",
            models.MatchParticipant.user_id != user_id
        ).count()
        
        total_approved = other_approved + 1
        if total_approved > match.max_players:
            raise HTTPException(409, "Phòng đã đủ người")
        record = attendance.record_for(db, match, user_id)
        if record.confirmation_status != "CONFIRMED":
            record.confirmation_status = "UNCONFIRMED"
        if total_approved >= match.max_players:
            match.status = "FULL"
            
    elif status == "REJECTED":
        attendance.cancel_commitment(db, match, user_id, "Chủ phòng từ chối hoặc gỡ thành viên", actor_id=match.host_id)
        other_approved = db.query(models.MatchParticipant).filter(
            models.MatchParticipant.match_id == match_id,
            models.MatchParticipant.status == "APPROVED",
            models.MatchParticipant.user_id != user_id
        ).count()
        if match.status == "FULL" and other_approved < match.max_players:
            match.status = "OPEN"
            
    participant.status = status
    attendance.event(db, match, match.host_id, "MEMBERSHIP_UPDATED", user_id, status=status, previous_status=previous_status)
    db.commit()
    db.refresh(participant)
    return participant
