from fastapi import APIRouter, Depends, HTTPException, Query, status
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from typing import List, Optional
from app import database, schemas, crud, auth_utils, models
from app.notification_utils import create_notification, display_name

router = APIRouter(
    prefix="/gamerooms",
    tags=["Game Rooms"]
)

@router.get("", response_model=List[schemas.MatchResponse])
def get_all_matches(
    sport_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(database.get_db)
):
    crud.close_expired_matches(db)
    return crud.get_matches(db, sport_id=sport_id, status=status)

@router.get("/mine", response_model=List[schemas.MatchResponse])
def get_my_matches(
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    crud.close_expired_matches(db)
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
            
    return crud.create_match(db, host_id=current_user.id, match=match_data)

@router.get("/{id}", response_model=schemas.MatchResponse)
def get_match_by_id(
    id: int,
    current_user = Depends(auth_utils.get_optional_current_user),
    db: Session = Depends(database.get_db),
):
    crud.close_expired_matches(db)
    match = crud.get_match_by_id(db, match_id=id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.status in ["CLOSED", "CANCELLED", "FINISHED"] and match.host_id != getattr(current_user, "id", None):
        raise HTTPException(status_code=404, detail="Match not found")
    return match

@router.put("/{id}", response_model=schemas.MatchResponse)
def update_existing_match(
    id: int,
    match_data: schemas.MatchCreate,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    crud.close_expired_matches(db)
    match = crud.get_match_by_id(db, match_id=id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can edit this match")
    now = datetime.now(timezone.utc).replace(tzinfo=None)
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
    if match_data.max_players < approved_count:
        raise HTTPException(status_code=409, detail="Số người tối đa không thể ít hơn số thành viên đã tham gia")
    return crud.update_match(db, match_id=id, data=match_data)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_match(
    id: int,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    match = crud.get_match_by_id(db, match_id=id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can delete this match")

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
            title="Phòng game đã bị xóa",
            body=f'Chủ phòng đã xóa phòng “{match.title}”.',
            target_url="/matches",
            entity_type="game_room",
            entity_id=match.id,
        )
    db.delete(match)
    db.commit()
    return None

@router.post("/{id}/join", response_model=schemas.MatchParticipantResponse)
def join_existing_match(
    id: int,
    data: schemas.MatchJoinRequest,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db)
):
    crud.close_expired_matches(db)
    # Check if match exists
    match = crud.get_match_by_id(db, match_id=id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.status in ["FULL", "CLOSED", "FINISHED", "CANCELLED"]:
        raise HTTPException(status_code=400, detail=f"Cannot join match in status {match.status}")
    if match.host_id == current_user.id:
        raise HTTPException(status_code=400, detail="Bạn là trưởng phòng này rồi")

    existing = db.query(models.MatchParticipant).filter_by(match_id=id, user_id=current_user.id).first()
    if existing and existing.status == "APPROVED":
        raise HTTPException(status_code=409, detail="Bạn đã tham gia phòng này")
    if existing and existing.status == "PENDING":
        raise HTTPException(status_code=409, detail="Yêu cầu tham gia của bạn đang chờ duyệt")

    participant = crud.join_match(db, match_id=id, user_id=current_user.id, note=data.note)
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
    return participant

@router.post("/{id}/leave")
def leave_existing_match(
    id: int,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db)
):
    crud.close_expired_matches(db)
    # Check if match exists
    match = crud.get_match_by_id(db, match_id=id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    success = crud.leave_match(db, match_id=id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=400, detail="You are not a participant in this match")
        
    return {"message": "Successfully left the match"}

@router.patch("/{id}/participants/{user_id}/status", response_model=schemas.MatchParticipantResponse)
def update_participant_status(
    id: int,
    user_id: int,
    status_data: schemas.ParticipantStatusUpdate,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db)
):
    crud.close_expired_matches(db)
    # Verify match exists
    match = crud.get_match_by_id(db, match_id=id)
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
    return participant


@router.patch("/{id}/participants/{user_id}/attendance", response_model=schemas.MatchParticipantResponse)
def update_participant_attendance(
    id: int,
    user_id: int,
    attendance_data: schemas.MatchAttendanceUpdate,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    crud.close_expired_matches(db)
    match = crud.get_match_by_id(db, match_id=id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can confirm attendance")
    if match.status == "CANCELLED":
        raise HTTPException(status_code=409, detail="Phòng đã bị hủy nên không thể xác nhận tham gia")
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if match.end_time > now:
        raise HTTPException(status_code=409, detail="Chỉ có thể xác nhận sau khi trận đấu kết thúc")

    participant = db.query(models.MatchParticipant).filter_by(
        match_id=id,
        user_id=user_id,
        status="APPROVED",
    ).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành viên đã được duyệt trong phòng")

    participant.attendance_status = attendance_data.attendance_status
    db.commit()
    db.refresh(participant)
    return participant

