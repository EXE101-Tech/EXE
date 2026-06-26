from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app import database, schemas, crud

router = APIRouter(
    prefix="/teams",
    tags=["Teams"]
)

@router.get("/top", response_model=List[schemas.TeamResponse])
def get_top_teams(
    sport_id: Optional[int] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(database.get_db)
):
    """
    Get top teams based on rating, optionally filtered by sport.
    """
    return crud.get_top_teams(db, sport_id=sport_id, limit=limit)
