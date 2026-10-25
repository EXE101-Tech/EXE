import time
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app import database, schemas, crud, auth_utils, models, attendance, seat_holds
from app.notification_utils import create_notification, display_name
from app.auto_room_search import notify_matching_users_for_match, notify_matches_for_preference
from app.auto_room_invites import process_auto_room_invite_for_match
from app.cache import memory_cache

router = APIRouter(
    prefix="/gamerooms",
    tags=["Game Rooms"]
)

_last_closed_matches_time = 0.0

def _close_expired_matches(db: Session):
    updated = crud.close_expired_matches(db)
    if updated:
        memory_cache.delete_prefix("gamerooms:list:")
    return updated


def throttled_close_expired_matches(db: Session, interval: int = 60):
    global _last_closed_matches_time
    now = time.time()
    if now - _last_closed_matches_time >= interval:
        _close_expired_matches(db)
        _last_closed_matches_time = now


def _require_premium(current_user):
    if not current_user.is_premium:
        raise HTTPException(status_code=403, detail="Tính năng tự động tìm phòng chỉ dành cho tài khoản Premium")


def _join_consent(match, data):
    if not match.seat_holds_enabled:
        return
    if not data.accepted_hold_policy:
        raise HTTPException(422, "Hãy đọc và đồng ý quy định giữ chỗ có thời hạn")
    if data.terms_version != match.terms_version:
        raise HTTPException(409, "Thông tin phòng đã thay đổi. Hãy tải lại và đọc điều kiện mới")
    if data.expected_arrival_at and not attendance.now() <= data.expected_arrival_at < match.end_time:
        raise HTTPException(422, "Giờ dự kiến đến phải từ hiện tại đến trước khi buổi chơi kết thúc")
    if match.start_time - attendance.now() < timedelta(minutes=30) and not data.expected_arrival_at:
        raise HTTPException(422, "Sát giờ chơi: vui lòng cho chủ phòng biết giờ dự kiến đến sân")


def _accept_invite(db, match, participant, current_user, data):
    if participant.response_deadline and attendance.now() >= participant.response_deadline:
        seat_holds.expire_room(db, match)
        db.commit()
        memory_cache.delete_prefix("gamerooms:list:")
        raise HTTPException(409, "Lời mời đã hết hạn. Hãy kiểm tra lại chỗ trống")
    if match.status in ("CLOSED", "FINISHED", "CANCELLED") or match.end_time <= attendance.now():
        raise HTTPException(409, "Buổi chơi đã kết thúc hoặc bị hủy")
    if seat_holds.reserved_count(db, match, excluding_user_id=current_user.id) >= match.max_players:
        raise HTTPException(409, "Phòng vừa đủ người")
    if match.seat_holds_enabled:
        if not data.accepted_policy:
            raise HTTPException(422, "Hãy đọc lịch, địa điểm và chi phí rồi xác nhận sẽ đến")
        if data.terms_version != match.terms_version:
            raise HTTPException(409, "Thông tin phòng đã thay đổi. Hãy đọc lại rồi nhận chỗ")
        participant.hold_policy_accepted = True
    participant.status = "APPROVED"
    participant.role = "PLAYER"
    participant.joined_at = attendance.now()
    attendance.record_for(db, match, current_user.id)
    db.flush()
    if match.seat_holds_enabled:
        attendance.confirm(db, match, current_user, data.terms_version)
    attendance.event(db, match, current_user.id, "INVITE_ACCEPTED", current_user.id)
    approved = db.query(models.MatchParticipant).filter_by(match_id=match.id, status="APPROVED").count()
    match.status = "FULL" if approved >= match.max_players else "OPEN"
    seat_holds.notify(db, match, match.host_id, "gameroom_auto_invite_accepted", "Đã có người nhận chỗ",
                      f'{display_name(current_user)} đã nhận suất trong “{match.title}”.')
    attendance.refresh_verification(db, match)
    db.commit()
    db.refresh(participant)
    memory_cache.delete_prefix("gamerooms:list:")
    return participant


@router.get("/auto-search", response_model=Optional[schemas.RoomSearchPreferenceResponse])
def get_auto_search_preference(
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _require_premium(current_user)
    return db.query(models.RoomSearchPreference).filter(
        models.RoomSearchPreference.user_id == current_user.id,
    ).first()


@router.put("/auto-search", response_model=schemas.RoomSearchPreferenceResponse)
def save_auto_search_preference(
    preference_data: schemas.RoomSearchPreferenceCreate,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _require_premium(current_user)
    if preference_data.sport_id and not db.query(models.Sport.id).filter(models.Sport.id == preference_data.sport_id).first():
        raise HTTPException(status_code=404, detail="Không tìm thấy môn thể thao")

    preference = db.query(models.RoomSearchPreference).filter(
        models.RoomSearchPreference.user_id == current_user.id,
    ).first()
    if preference is None:
        preference = models.RoomSearchPreference(user_id=current_user.id)
        db.add(preference)
    for field in ("sport_id", "required_level", "max_price", "location", "is_active"):
        setattr(preference, field, getattr(preference_data, field))
    preference.time_slots = [slot.model_dump() for slot in preference_data.time_slots]
    preference.updated_at = models.utc_now_naive()
    db.commit()
    db.refresh(preference)
    notify_matches_for_preference(db, preference)
    db.commit()
    return preference


@router.delete("/auto-search", status_code=status.HTTP_204_NO_CONTENT)
def delete_auto_search_preference(
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _require_premium(current_user)
    preference = db.query(models.RoomSearchPreference).filter(
        models.RoomSearchPreference.user_id == current_user.id,
    ).first()
    if preference:
        db.delete(preference)
        db.commit()
    return None

@router.get("", response_model=List[schemas.MatchResponse])
def get_all_matches(
    sport_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(database.get_db)
):
    throttled_close_expired_matches(db)
    cache_key = f"gamerooms:list:{sport_id}:{status}"
    cached = memory_cache.get(cache_key)
    if cached is not None:
        return cached
    data = crud.get_matches(db, sport_id=sport_id, status=status)
    memory_cache.set(cache_key, data, ttl=10)
    return data

@router.get("/mine", response_model=List[schemas.MatchResponse])
def get_my_matches(
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    throttled_close_expired_matches(db)
    return crud.get_matches(db, host_id=current_user.id)

@router.post("", response_model=schemas.MatchResponse, status_code=status.HTTP_201_CREATED)
def create_new_match(
    match_data: schemas.MatchCreate,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Verify sport exists
    sport = db.query(models.Sport).filter(models.Sport.id == match_data.sport_id).first()
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found")
        
    # Verify court exists if provided
    if match_data.court_id:
        court = crud.get_court_by_id(db, court_id=match_data.court_id)
        if not court:
            raise HTTPException(status_code=404, detail="Court not found")
            
    match = crud.create_match(db, host_id=current_user.id, match=match_data)
    notify_matching_users_for_match(db, match, actor=current_user)
    process_auto_room_invite_for_match(db, match)
    db.commit()
    memory_cache.delete_prefix("gamerooms:list:")
    return match

@router.get("/{id}", response_model=schemas.MatchResponse)
def get_match_by_id(
    id: int,
    current_user = Depends(auth_utils.get_optional_current_user),
    db: Session = Depends(database.get_db),
):
    if current_user and current_user.is_admin:
        raise HTTPException(status_code=403, detail="Tài khoản quản trị chỉ dùng để kiểm duyệt")
    _close_expired_matches(db)
    match = crud.get_match_by_id(db, match_id=id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.status in ["CLOSED", "CANCELLED", "FINISHED"] and match.host_id != getattr(current_user, "id", None):
        membership = db.query(models.MatchParticipant.id).filter_by(
            match_id=id, user_id=getattr(current_user, "id", None),
        ).first()
        if not membership:
            raise HTTPException(status_code=404, detail="Match not found")
    return attendance.attach_reputations(db, [match])[0]

@router.put("/{id}", response_model=schemas.MatchResponse)
def update_existing_match(
    id: int,
    match_data: schemas.MatchCreate,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    if current_user.is_admin:
        raise HTTPException(status_code=403, detail="Tài khoản quản trị chỉ dùng để kiểm duyệt")
    _close_expired_matches(db)
    match = attendance.lock_room(db, id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can edit this match")
    now = attendance.now()
    if match.status in ["CLOSED", "CANCELLED", "FINISHED"] or match.end_time <= now:
        raise HTTPException(status_code=409, detail="Phòng đã đóng nên không thể chỉnh sửa")
    if match_data.end_time <= now:
        raise HTTPException(status_code=422, detail="Thời gian kết thúc mới phải ở trong tương lai")
    sport = db.query(models.Sport).filter(models.Sport.id == match_data.sport_id).first()
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found")
    if match_data.court_id and not crud.get_court_by_id(db, court_id=match_data.court_id):
        raise HTTPException(status_code=404, detail="Court not found")
    approved_count = db.query(models.MatchParticipant).filter_by(match_id=id, status="APPROVED").count()
    if match_data.max_players < max(approved_count, seat_holds.reserved_count(db, match)):
        raise HTTPException(status_code=409, detail="Số người tối đa không thể ít hơn số thành viên đã tham gia")
    updated_match = crud.update_match(db, match_id=id, data=match_data)
    notify_matching_users_for_match(db, updated_match, actor=current_user)
    process_auto_room_invite_for_match(db, updated_match)
    db.commit()
    memory_cache.delete_prefix("gamerooms:list:")
    return updated_match

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_match(
    id: int,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    match = attendance.lock_room(db, id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if not current_user.is_admin and match.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can delete this match")
    if match.trust_session and match.trust_session.removed_at:
        return None

    approved_members = db.query(models.MatchParticipant.user_id).filter(
        models.MatchParticipant.match_id == id,
        models.MatchParticipant.status == "APPROVED",
        models.MatchParticipant.user_id != current_user.id,
    ).all()
    for (recipient_id,) in approved_members:
        create_notification(
            db,
            recipient_id=recipient_id,
            actor=current_user,
            notification_type="gameroom_deleted",
            title="Buổi chơi đã bị hủy" if match.end_time > attendance.now() else "Buổi chơi đã được gỡ",
            body=(f'Chủ phòng đã hủy buổi “{match.title}”. Bạn không bị tính vắng.'
                  if match.end_time > attendance.now() else f'Chủ phòng đã gỡ buổi “{match.title}”. Bạn vẫn có thể xem lại kết quả.'),
            target_url=f"/matches?attendance={match.id}",
            entity_type="game_room",
            entity_id=match.id,
        )
    attendance.cancel_room(db, match, current_user.id, removed=True)
    db.commit()
    memory_cache.delete_prefix("gamerooms:list:")
    return None

@router.post("/{id}/join", response_model=schemas.MatchParticipantResponse)
def join_existing_match(
    id: int,
    data: schemas.MatchJoinRequest,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db)
):
    if current_user.is_admin:
        raise HTTPException(status_code=403, detail="Tài khoản quản trị chỉ dùng để kiểm duyệt")
    _close_expired_matches(db)
    # Check if match exists
    match = attendance.lock_room(db, id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.status in ["CLOSED", "FINISHED", "CANCELLED"]:
        raise HTTPException(status_code=400, detail=f"Cannot join match in status {match.status}")
    if match.host_id == current_user.id:
        raise HTTPException(status_code=400, detail="Bạn là trưởng phòng này rồi")

    existing = db.query(models.MatchParticipant).filter_by(match_id=id, user_id=current_user.id).first()
    if existing and existing.status == "APPROVED":
        raise HTTPException(status_code=409, detail="Bạn đã tham gia phòng này")
    if existing and existing.status == "PENDING":
        if existing.invite_source in seat_holds.INVITE_SOURCES:
            return _accept_invite(db, match, existing, current_user, schemas.MatchInviteResponse(
                action="ACCEPT", accepted_policy=data.accepted_hold_policy, terms_version=data.terms_version))
        if data.expected_arrival_at:
            _join_consent(match, data)
            existing.expected_arrival_at = data.expected_arrival_at
            existing.note = data.note
            db.commit()
            return existing
        raise HTTPException(status_code=409, detail="Yêu cầu tham gia của bạn đang chờ duyệt")

    if match.status == "FULL" or seat_holds.reserved_count(db, match) >= match.max_players:
        raise HTTPException(409, "Phòng đang đủ chỗ giữ. Bạn có thể đăng ký dự bị")
    _join_consent(match, data)
    participant = crud.join_match(db, match_id=id, user_id=current_user.id, note=data.note,
                                 accepted_hold_policy=data.accepted_hold_policy, expected_arrival_at=data.expected_arrival_at)
    create_notification(
        db,
        recipient_id=match.host_id,
        actor=current_user,
        notification_type="gameroom_join_request",
        title="Có yêu cầu vào phòng game",
        body=f'{display_name(current_user)} muốn tham gia phòng “{match.title}”.',
        target_url="/matches",
        entity_type="game_room",
        entity_id=match.id,
    )
    db.commit()
    db.refresh(participant)
    memory_cache.delete_prefix("gamerooms:list:")
    return participant


@router.post("/{id}/waitlist", response_model=schemas.MatchParticipantResponse)
def join_waitlist(id: int, data: schemas.MatchJoinRequest,
                  current_user=Depends(auth_utils.get_current_user), db: Session = Depends(database.get_db)):
    if current_user.is_admin:
        raise HTTPException(403, "Tài khoản quản trị chỉ dùng để kiểm duyệt")
    _close_expired_matches(db)
    match = attendance.lock_room(db, id)
    if not match.seat_holds_enabled or not match.host.is_premium:
        raise HTTPException(403, "Phòng chưa bật danh sách dự bị Premium")
    if match.status not in ("OPEN", "FULL"):
        raise HTTPException(409, "Phòng không còn nhận đăng ký dự bị")
    if match.host_id == current_user.id:
        raise HTTPException(409, "Bạn đang là chủ phòng")
    _join_consent(match, data)
    participant = db.query(models.MatchParticipant).filter_by(match_id=id, user_id=current_user.id).first()
    if match.start_time <= attendance.now() and (not participant or participant.status != "WAITLISTED"):
        raise HTTPException(409, "Buổi đã bắt đầu, chỉ cập nhật giờ đến cho người đang dự bị")
    if participant and participant.status in ("APPROVED", "PENDING"):
        raise HTTPException(409, "Bạn đã có chỗ hoặc yêu cầu/lời mời đang chờ")
    if not participant:
        participant = models.MatchParticipant(match_id=id, user_id=current_user.id, role="PLAYER")
        db.add(participant)
    if participant.status != "WAITLISTED":
        participant.joined_at = attendance.now()
        attendance.reset_after_rejoin(db, match, current_user.id)
        attendance.event(db, match, current_user.id, "WAITLIST_JOINED", current_user.id)
    participant.status = "WAITLISTED"
    participant.invite_source = None
    participant.response_deadline = None
    participant.hold_policy_accepted = True
    participant.expected_arrival_at = data.expected_arrival_at
    participant.note = data.note
    db.flush()
    process_auto_room_invite_for_match(db, match)
    db.commit()
    db.refresh(participant)
    memory_cache.delete_prefix("gamerooms:list:")
    return participant

@router.post("/{id}/leave")
def leave_existing_match(
    id: int,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
    data: Optional[schemas.AttendanceCancellation] = None,
):
    if current_user.is_admin:
        raise HTTPException(status_code=403, detail="Tài khoản quản trị chỉ dùng để kiểm duyệt")
    _close_expired_matches(db)
    # Check if match exists
    match = crud.get_match_by_id(db, match_id=id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    success = crud.leave_match(db, match_id=id, user_id=current_user.id,
                              reason=data.reason if data else "Người chơi rời phòng")
    if not success:
        raise HTTPException(status_code=400, detail="You are not a participant in this match")
    process_auto_room_invite_for_match(db, match)
    db.commit()
    memory_cache.delete_prefix("gamerooms:list:")
    return {"message": "Successfully left the match"}

@router.patch("/{id}/participants/{user_id}/status", response_model=schemas.MatchParticipantResponse)
def update_participant_status(
    id: int,
    user_id: int,
    status_data: schemas.ParticipantStatusUpdate,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db)
):
    _close_expired_matches(db)
    # Verify match exists
    match = attendance.lock_room(db, id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    # Verify match is not cancelled
    if match.status in ["CLOSED", "CANCELLED", "FINISHED"]:
        raise HTTPException(status_code=400, detail="Cannot update participant status for a closed match")
        
    # Verify current user is the host
    if match.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can update participant status")
        
    # Host cannot update their own status
    if match.host_id == user_id:
        raise HTTPException(status_code=400, detail="Host status cannot be updated")
        
    participant_before = db.query(models.MatchParticipant).filter_by(match_id=id, user_id=user_id).first()
    if not participant_before:
        raise HTTPException(status_code=404, detail="Participant not found")
    previous_status = participant_before.status
    participant = crud.update_match_participant_status(db, match_id=id, user_id=user_id, status=status_data.status)
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    if status_data.status == "APPROVED" and participant.response_deadline:
        # assign_hold already delivered the approval together with its deadline.
        memory_cache.delete_prefix("gamerooms:list:")
        return participant
    if previous_status != status_data.status:
        if status_data.status == "APPROVED":
            notification_type = "gameroom_join_approved"
            title = "Bạn đã được duyệt vào phòng game"
            body = f'Chủ phòng đã chấp nhận yêu cầu tham gia phòng “{match.title}”.'
        else:
            notification_type = "gameroom_join_rejected" if previous_status == "PENDING" else "gameroom_member_removed"
            title = "Yêu cầu vào phòng đã bị từ chối" if previous_status == "PENDING" else "Bạn đã bị xóa khỏi phòng game"
            body = (
                f'Chủ phòng đã từ chối yêu cầu tham gia phòng “{match.title}”.'
                if previous_status == "PENDING"
                else f'Chủ phòng đã xóa bạn khỏi phòng “{match.title}”.'
            )
        create_notification(
            db,
            recipient_id=user_id,
            actor=current_user,
            notification_type=notification_type,
            title=title,
            body=body,
            target_url="/matches",
            entity_type="game_room",
            entity_id=match.id,
        )
        db.commit()
        memory_cache.delete_prefix("gamerooms:list:")
    if status_data.status == "REJECTED":
        process_auto_room_invite_for_match(db, match)
        db.commit()
    return participant


@router.patch("/{id}/participants/{user_id}/attendance", response_model=schemas.MatchParticipantResponse)
def update_participant_attendance(
    id: int,
    user_id: int,
    attendance_data: schemas.MatchAttendanceUpdate,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _close_expired_matches(db)
    match = attendance.lock_room(db, id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can confirm attendance")
    if match.status == "CANCELLED":
        raise HTTPException(status_code=409, detail="Phòng đã bị hủy nên không thể xác nhận tham gia")
    participant = db.query(models.MatchParticipant).filter_by(
        match_id=id,
        user_id=user_id,
        status="APPROVED",
    ).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành viên đã được duyệt trong phòng")

    attendance.report_host(db, match, current_user, user_id, attendance_data.attendance_status)
    db.commit()
    db.refresh(participant)
    memory_cache.delete_prefix("gamerooms:list:")
    return participant


@router.post("/{id}/invite-response", response_model=schemas.MatchParticipantResponse)
def respond_to_auto_invite(
    id: int,
    response_data: schemas.MatchInviteResponse,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    if current_user.is_admin:
        raise HTTPException(status_code=403, detail="Tài khoản quản trị chỉ dùng để kiểm duyệt")
    match = attendance.lock_room(db, id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    participant = db.query(models.MatchParticipant).filter(
        models.MatchParticipant.match_id == id,
        models.MatchParticipant.user_id == current_user.id,
        models.MatchParticipant.invite_source.in_(seat_holds.INVITE_SOURCES),
    ).first()
    if not participant or participant.status != "PENDING":
        raise HTTPException(status_code=404, detail="Không tìm thấy lời mời đang chờ")

    if response_data.action == "REJECT":
        participant.status = "REJECTED"
        participant.response_deadline = None
        create_notification(
            db,
            recipient_id=match.host_id,
            actor=current_user,
            notification_type="gameroom_auto_invite_rejected",
            title="Lời mời tự động bị từ chối",
            body=f'{display_name(current_user)} đã từ chối lời mời vào phòng “{match.title}”.',
            target_url="/matches",
            entity_type="game_room",
            entity_id=match.id,
        )
        db.flush()
        process_auto_room_invite_for_match(db, match)
        db.commit()
        db.refresh(participant)
        memory_cache.delete_prefix("gamerooms:list:")
        return participant

    return _accept_invite(db, match, participant, current_user, response_data)

