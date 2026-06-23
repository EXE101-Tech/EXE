from sqlalchemy.orm import Session
from app import models, schemas

def create_match(db: Session, host_id: int, match: schemas.MatchCreate):
    db_match = models.Match(
        host_id=host_id,
        sport_id=match.sport_id,
        court_id=match.court_id,
        title=match.title,
        description=match.description,
        required_level=match.required_level,
        start_time=match.start_time,
        end_time=match.end_time,
        max_players=match.max_players,
        status="OPEN"
    )
    db.add(db_match)
    db.commit()
    db.refresh(db_match)
    
    # Host automatically joins the match and is APPROVED
    db_host_participant = models.MatchParticipant(
        match_id=db_match.id,
        user_id=host_id,
        role="HOST",
        status="APPROVED"
    )
    db.add(db_host_participant)
    db.commit()
    db.refresh(db_match)
    return db_match

def get_matches(db: Session, sport_id: int = None, status: str = None):
    query = db.query(models.Match)
    if sport_id:
        query = query.filter(models.Match.sport_id == sport_id)
    if status:
        query = query.filter(models.Match.status == status)
    return query.all()

def get_match_by_id(db: Session, match_id: int):
    return db.query(models.Match).filter(models.Match.id == match_id).first()

def join_match(db: Session, match_id: int, user_id: int):
    exists = db.query(models.MatchParticipant).filter(
        models.MatchParticipant.match_id == match_id,
        models.MatchParticipant.user_id == user_id
    ).first()
    if exists:
        return exists
        
    db_participant = models.MatchParticipant(
        match_id=match_id,
        user_id=user_id,
        role="PLAYER",
        status="PENDING"  # Default status is PENDING to support approval flow
    )
    db.add(db_participant)
    db.commit()
    return db_participant

def leave_match(db: Session, match_id: int, user_id: int):
    db_participant = db.query(models.MatchParticipant).filter(
        models.MatchParticipant.match_id == match_id,
        models.MatchParticipant.user_id == user_id
    ).first()
    if db_participant:
        is_host = db_participant.role == "HOST"
        db.delete(db_participant)
        
        match = get_match_by_id(db, match_id)
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
            else:
                match.status = "CANCELLED"
        else:
            # If match was full, make it open again (need to verify if approved players is less than max)
            approved_count = db.query(models.MatchParticipant).filter(
                models.MatchParticipant.match_id == match_id,
                models.MatchParticipant.status == "APPROVED"
            ).count()
            if match.status == "FULL" and approved_count < match.max_players:
                match.status = "OPEN"
                
        db.commit()
        return True
    return False

def update_match_participant_status(db: Session, match_id: int, user_id: int, status: str):
    participant = db.query(models.MatchParticipant).filter(
        models.MatchParticipant.match_id == match_id,
        models.MatchParticipant.user_id == user_id
    ).first()
    if not participant:
        return None
        
    if participant.status == status:
        return participant
        
    participant.status = status
    
    match = get_match_by_id(db, match_id)
    if status == "APPROVED":
        other_approved = db.query(models.MatchParticipant).filter(
            models.MatchParticipant.match_id == match_id,
            models.MatchParticipant.status == "APPROVED",
            models.MatchParticipant.user_id != user_id
        ).count()
        
        total_approved = other_approved + 1
        if total_approved >= match.max_players:
            match.status = "FULL"
            
    elif status == "REJECTED":
        other_approved = db.query(models.MatchParticipant).filter(
            models.MatchParticipant.match_id == match_id,
            models.MatchParticipant.status == "APPROVED",
            models.MatchParticipant.user_id != user_id
        ).count()
        if match.status == "FULL" and other_approved < match.max_players:
            match.status = "OPEN"
            
    db.commit()
    db.refresh(participant)
    return participant
