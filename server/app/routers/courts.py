from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app import database, schemas, crud, auth_utils

router = APIRouter(
    prefix="/courts",
    tags=["Courts & Venues"]
)

@router.get("", response_model=List[schemas.CourtResponse])
def get_all_courts(
    venue_id: Optional[int] = Query(None, description="Filter by Venue ID"),
    sport_id: Optional[int] = Query(None, description="Filter by Sport ID"),
    db: Session = Depends(database.get_db)
):
    return crud.get_courts(db, venue_id=venue_id, sport_id=sport_id)

@router.get("/nearby", response_model=List[schemas.VenueResponse])
def get_nearby_venues(
    lat: float = Query(..., description="Latitude of user"),
    lng: float = Query(..., description="Longitude of user"),
    radius: float = Query(5.0, description="Radius in kilometers"),
    db: Session = Depends(database.get_db)
):
    return crud.get_nearby_venues(db, lat=lat, lng=lng, radius=radius)

@router.get("/venues", response_model=List[schemas.VenueMinResponse])
def get_all_venues(db: Session = Depends(database.get_db)):
    """Lấy tất cả venue."""
    return crud.get_venues(db)

@router.post("/venues", response_model=schemas.VenueMinResponse)
def create_venue(
    venue: schemas.VenueCreate,
    db: Session = Depends(database.get_db),
    current_user = Depends(auth_utils.get_current_user)
):
    """
    Tạo venue mới. Nếu không cung cấp latitude/longitude,
    hệ thống sẽ tự động geocode từ address.
    """
    return crud.create_venue(db, venue, owner_id=current_user.id)

@router.get("/{id}", response_model=schemas.CourtResponse)
def get_court_by_id(id: int, db: Session = Depends(database.get_db)):
    court = crud.get_court_by_id(db, court_id=id)
    if not court:
        raise HTTPException(status_code=404, detail="Court not found")
    return court

