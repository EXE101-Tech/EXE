from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app import database, schemas, crud, auth_utils, models

router = APIRouter(
    prefix="/matches",
    tags=["Matches"]
)

@router.get("", response_model=List[schemas.MatchResponse])
def get_all_matches(
    sport_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(database.get_db)
):
    return crud.get_matches(db, sport_id=sport_id, status=status)

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
def get_match_by_id(id: int, db: Session = Depends(database.get_db)):
    match = crud.get_match_by_id(db, match_id=id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match

@router.post("/{id}/join", response_model=schemas.MatchParticipantResponse)
def join_existing_match(
    id: int,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Check if match exists
    match = crud.get_match_by_id(db, match_id=id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.status in ["FULL", "FINISHED", "CANCELLED"]:
        raise HTTPException(status_code=400, detail=f"Cannot join match in status {match.status}")
        
    return crud.join_match(db, match_id=id, user_id=current_user.id)

@router.post("/{id}/leave")
def leave_existing_match(
    id: int,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db)
):
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
    # Verify match exists
    match = crud.get_match_by_id(db, match_id=id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    # Verify match is not cancelled
    if match.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="Cannot update participant status for a cancelled match")
        
    # Verify current user is the host
    if match.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can update participant status")
        
    # Host cannot update their own status
    if match.host_id == user_id:
        raise HTTPException(status_code=400, detail="Host status cannot be updated")
        
    participant = crud.update_match_participant_status(db, match_id=id, user_id=user_id, status=status_data.status)
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    return participant

