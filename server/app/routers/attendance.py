from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

from app import attendance, auth_utils, database, models, schemas
from app.cache import memory_cache
from app.crud.matches import _match_eager_options, close_expired_matches


router = APIRouter(tags=["Attendance and reputation"])


def _finish(db, room, user):
    db.flush()
    db.commit()
    memory_cache.delete_prefix("gamerooms:list:")
    return attendance.room_state(db, room, user)


def _member(user):
    if user.is_admin:
        raise HTTPException(403, "Tài khoản quản trị chỉ dùng để kiểm duyệt")


@router.get("/gamerooms/attendance-policy")
def get_policy():
    return attendance.default_policy()


@router.get("/gamerooms/required-feedback")
def required_feedback(user=Depends(auth_utils.get_current_user), db: Session = Depends(database.get_db)):
    _member(user)
    if close_expired_matches(db):
        memory_cache.delete_prefix("gamerooms:list:")
    return attendance.required_feedback(db, user.id)


@router.get("/gamerooms/participating", response_model=list[schemas.MatchResponse])
def participating_rooms(
    limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0),
    user=Depends(auth_utils.get_current_user), db: Session = Depends(database.get_db),
):
    _member(user)
    if close_expired_matches(db):
        memory_cache.delete_prefix("gamerooms:list:")
    ids = db.query(models.MatchParticipant.match_id).filter_by(user_id=user.id)
    rooms = db.query(models.Match).options(*_match_eager_options()).filter(
        models.Match.id.in_(ids),
    ).order_by(models.Match.start_time.desc(), models.Match.id.desc()).offset(offset).limit(limit).all()
    return attendance.attach_reputations(db, rooms)


@router.get("/gamerooms/{match_id}/attendance")
def get_attendance(match_id: int, user=Depends(auth_utils.get_current_user), db: Session = Depends(database.get_db)):
    if close_expired_matches(db):
        memory_cache.delete_prefix("gamerooms:list:")
    room = db.query(models.Match).filter_by(id=match_id).first()
    if not room:
        raise HTTPException(404, "Không tìm thấy phòng chơi")
    return attendance.room_state(db, room, user)


@router.post("/gamerooms/{match_id}/attendance/confirm")
def confirm_attendance(match_id: int, data: schemas.AttendanceConfirmation,
                       user=Depends(auth_utils.get_current_user), db: Session = Depends(database.get_db)):
    _member(user)
    room = attendance.lock_room(db, match_id)
    attendance.confirm(db, room, user, data.terms_version)
    return _finish(db, room, user)


@router.post("/gamerooms/{match_id}/attendance/checkin-code")
def open_checkin(match_id: int, user=Depends(auth_utils.get_current_user), db: Session = Depends(database.get_db)):
    _member(user)
    room = attendance.lock_room(db, match_id)
    result = attendance.open_checkin(db, room, user)
    db.commit()
    return result


@router.post("/gamerooms/{match_id}/attendance/checkin")
def checkin(match_id: int, data: schemas.AttendanceCheckin,
            user=Depends(auth_utils.get_current_user), db: Session = Depends(database.get_db)):
    _member(user)
    room = attendance.lock_room(db, match_id)
    attendance.check_in(db, room, user, data.code)
    return _finish(db, room, user)


@router.put("/gamerooms/{match_id}/attendance/report")
def report(match_id: int, data: schemas.AttendanceSelfReport,
           user=Depends(auth_utils.get_current_user), db: Session = Depends(database.get_db)):
    _member(user)
    room = attendance.lock_room(db, match_id)
    attendance.report_self(db, room, user, data.occurred, data.attended)
    return _finish(db, room, user)


@router.post("/gamerooms/{match_id}/attendance/low-attendance")
def decide_low_attendance(match_id: int, data: schemas.LowAttendanceDecision,
                          user=Depends(auth_utils.get_current_user), db: Session = Depends(database.get_db)):
    _member(user)
    room = attendance.lock_room(db, match_id)
    attendance.decide_low_attendance(db, room, user, data.action)
    return _finish(db, room, user)


@router.put("/gamerooms/{match_id}/attendance/peers/{user_id}")
def peer_report(match_id: int, user_id: int, data: schemas.AttendancePeerReport,
                user=Depends(auth_utils.get_current_user), db: Session = Depends(database.get_db)):
    _member(user)
    room = attendance.lock_room(db, match_id)
    attendance.report_peer(db, room, user, user_id, data.attended, report=data.report)
    return _finish(db, room, user)


def _visible_user(db, viewer, user_id):
    target = db.query(models.User).options(
        joinedload(models.User.profile), joinedload(models.User.sports).joinedload(models.UserSport.sport),
    ).filter_by(id=user_id, status="active").first()
    if not target:
        raise HTTPException(404, "Không tìm thấy người chơi")
    if db.query(models.UserBlock.id).filter(or_(
        and_(models.UserBlock.blocker_id == viewer.id, models.UserBlock.blocked_id == user_id),
        and_(models.UserBlock.blocker_id == user_id, models.UserBlock.blocked_id == viewer.id),
    )).first():
        raise HTTPException(403, "Không thể xem hồ sơ này")
    return target


@router.get("/reputation/users/{user_id}")
def get_reputation(user_id: int, user=Depends(auth_utils.get_current_user), db: Session = Depends(database.get_db)):
    _visible_user(db, user, user_id)
    return attendance.reputations(db, [user_id])[user_id]


@router.get("/users/{user_id}/public-profile", response_model=schemas.PublicUserProfile)
def get_public_profile(user_id: int, user=Depends(auth_utils.get_current_user), db: Session = Depends(database.get_db)):
    """What other members may see before playing with someone: skill, activity and reputation, no contact data."""
    target = _visible_user(db, user, user_id)
    profile = target.profile
    confirmed = attendance.verified_games_by_sport(db, target.id)
    sports = [{
        "sport_id": item.sport_id,
        "sport_name": item.sport.name if item.sport else None,
        "skill_level": item.skill_level,
        "games_played": int(item.games_played or 0) + confirmed.get(item.sport_id, 0),
    } for item in target.sports]
    # Verified games in a sport the player never added to their profile still count as activity.
    listed = {item.sport_id for item in target.sports}
    missing = [sport_id for sport_id in confirmed if sport_id not in listed]
    for sport in db.query(models.Sport).filter(models.Sport.id.in_(missing)).all() if missing else []:
        sports.append({"sport_id": sport.id, "sport_name": sport.name, "skill_level": None, "games_played": confirmed[sport.id]})
    return {
        "id": target.id,
        "name": (profile.full_name if profile and profile.full_name else target.email.split("@")[0]),
        "avatar_url": profile.avatar_url if profile else None,
        "cover_url": profile.cover_url if profile else None,
        "bio": profile.bio if profile else None,
        "district": profile.district if profile else None,
        "is_premium": target.is_premium,
        "member_since": target.created_at,
        "games_played": sum(item["games_played"] for item in sports),
        "hosted_games": db.query(models.Match.id).filter(models.Match.host_id == target.id, models.Match.status != "CANCELLED").count(),
        "teams_joined": db.query(models.TeamMembership).filter_by(user_id=target.id, status="APPROVED").count(),
        "sports": sports,
        "reputation": attendance.reputations(db, [target.id])[target.id],
        "is_self": target.id == user.id,
        "friendship": _friendship_state(db, user.id, target.id),
    }


def _friendship_state(db, viewer_id, target_id):
    """none / friends / outgoing (viewer sent) / incoming (viewer can accept)."""
    low_id, high_id = sorted((viewer_id, target_id))
    relationship = db.query(models.Friendship).filter_by(user_low_id=low_id, user_high_id=high_id).first()
    if not relationship or viewer_id == target_id:
        return {"id": None, "status": "none"}
    if relationship.status == "accepted":
        return {"id": relationship.id, "status": "friends"}
    return {"id": relationship.id, "status": "outgoing" if relationship.requester_id == viewer_id else "incoming"}
