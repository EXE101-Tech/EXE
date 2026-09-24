from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app import database, schemas, crud, auth_utils, models
from app.sport_catalog import sport_catalog, sport_key_for


def _batch_venues_payload(db: Session, venues: List[models.Venue]):
    if not venues:
        return []
    venue_ids = [v.id for v in venues]
    all_courts = db.query(models.Court).options(
        joinedload(models.Court.sport),
        joinedload(models.Court.venue),
    ).filter(
        models.Court.venue_id.in_(venue_ids),
        models.Court.is_active.is_(True),
    ).order_by(models.Court.id.asc()).all()

    courts_by_venue = {}
    for c in all_courts:
        courts_by_venue.setdefault(c.venue_id, []).append(c)

    owner_ids = {v.owner_id for v in venues if v.owner_id}
    owners_by_id = {}
    if owner_ids:
        owners = db.query(models.User).options(
            joinedload(models.User.profile)
        ).filter(models.User.id.in_(owner_ids)).all()
        owners_by_id = {u.id: u for u in owners}

    result = []
    for venue in venues:
        courts = courts_by_venue.get(venue.id, [])
        sport_key = venue.sport_key or (sport_key_for(courts[0].sport.name) if courts and courts[0].sport else None)
        price_label = venue.price_label
        if not price_label and courts:
            per_30_minutes = min(court.price_per_hour for court in courts) // 2
            price_label = f"{per_30_minutes:,}".replace(",", ".") + "đ"
        owner = owners_by_id.get(venue.owner_id)
        owner_name = owner.profile.full_name if owner and owner.profile and owner.profile.full_name else (owner.email if owner else None)
        result.append({
            "id": venue.id,
            "name": venue.name,
            "address": venue.address,
            "latitude": venue.latitude,
            "longitude": venue.longitude,
            "description": venue.description,
            "owner_id": venue.owner_id,
            "owner_name": owner_name,
            "sport_key": sport_key,
            "price_label": price_label,
            "court_count": len(courts),
            "facilities": venue.facilities or {},
            "image_url": venue.image_url,
            "rating": None,
            "review_count": 0,
            "courts": courts,
        })
    return result


def _venue_payload(db: Session, venue: models.Venue):
    results = _batch_venues_payload(db, [venue])
    return results[0] if results else None


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
    return _batch_venues_payload(db, crud.get_nearby_venues(db, lat=lat, lng=lng, radius=radius))

@router.get("/venues", response_model=List[schemas.VenueResponse])
def get_all_venues(db: Session = Depends(database.get_db)):
    return _batch_venues_payload(db, crud.get_venues(db))


@router.get("/venues/{venue_id}", response_model=schemas.VenueResponse)
def get_venue_details(venue_id: int, db: Session = Depends(database.get_db)):
    venue = crud.get_venue_by_id(db, venue_id)
    if not venue:
        raise HTTPException(status_code=404, detail="Không tìm thấy sân")
    return _venue_payload(db, venue)

@router.get("/sports", response_model=List[schemas.SportCatalogItem])
def get_supported_sports(db: Session = Depends(database.get_db)):
    return sport_catalog(db)

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
    if current_user.owner_status != "registered":
        raise HTTPException(status_code=403, detail="Bạn cần đăng ký chủ sân trước")
    return crud.create_venue(db, venue, owner_id=current_user.id)

@router.get("/{id}", response_model=schemas.CourtResponse)
def get_court_by_id(id: int, db: Session = Depends(database.get_db)):
    court = crud.get_court_by_id(db, court_id=id)
    if not court:
        raise HTTPException(status_code=404, detail="Court not found")
    return court

