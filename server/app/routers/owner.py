import re
from typing import List
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi import Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import auth_utils, database, models, schemas
from app.geocoding import geocode_address
from app.sport_catalog import resolve_sport

router = APIRouter(prefix="/courts/owner", tags=["Court owner"])

def _owned_venue(db: Session, venue_id: int, owner_id: int):
    venue = db.query(models.Venue).filter(
        models.Venue.id == venue_id,
        models.Venue.owner_id == owner_id,
        models.Venue.is_active.is_(True),
    ).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Không tìm thấy sân của bạn")
    return venue


def _venue_payload(venue: models.Venue):
    return {
        "id": venue.id,
        "name": venue.name,
        "address": venue.address,
        "latitude": venue.latitude,
        "longitude": venue.longitude,
        "description": venue.description,
        "owner_id": venue.owner_id,
        "sport_id": venue.sport_key,
        "price_label": venue.price_label or "50.000đ",
        "court_count": venue.court_count,
        "facilities": venue.facilities or {},
        "image_url": venue.image_url,
        "is_active": venue.is_active,
    }


def _resolve_sport(db: Session, sport_key: str):
    return resolve_sport(db, sport_key)


def _price_per_hour(price_label: str) -> int:
    match = re.search(r"\d[\d.]*", price_label or "")
    if not match:
        raise HTTPException(status_code=422, detail="Giá sân cần bắt đầu bằng số tiền, ví dụ 50.000đ")
    amount = int(match.group(0).replace(".", ""))
    if amount <= 0 or amount > 100_000_000:
        raise HTTPException(status_code=422, detail="Giá sân không hợp lệ")
    # The booking UI displays a 30-minute price while the core Court model stores hourly price.
    return amount * 2


def _update_courts(db: Session, venue: models.Venue, sport: models.Sport, count: int, price: int):
    courts = db.query(models.Court).filter(models.Court.venue_id == venue.id).order_by(models.Court.id.asc()).all()
    active = [court for court in courts if court.is_active]
    for index, court in enumerate(active):
        if index >= count:
            court.is_active = False
        else:
            court.name = f"{venue.name} - Sân {index + 1}"
            court.sport_id = sport.id
            court.price_per_hour = price
    remaining = max(0, count - len(active))
    for index in range(remaining):
        db.add(models.Court(
            venue_id=venue.id,
            name=f"{venue.name} - Sân {len(active) + index + 1}",
            sport_id=sport.id,
            price_per_hour=price,
            is_active=True,
        ))
    venue.court_count = count


@router.get("/status", response_model=schemas.OwnerRegistrationResponse)
def get_registration_status(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    count = db.query(models.Venue).filter_by(owner_id=current_user.id, is_active=True).count()
    return {"owner_status": current_user.owner_status, "owned_venues_count": count}


@router.post("/register", response_model=schemas.OwnerRegistrationResponse)
def register_as_owner(
    data: schemas.OwnerRegistrationRequest,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    if not data.accepted_terms:
        raise HTTPException(status_code=400, detail="Bạn cần xác nhận và đồng ý với quy định chủ sân")
    current_user.owner_status = "registered"
    db.commit()
    return get_registration_status(current_user, db)


@router.delete("/registration", response_model=schemas.OwnerRegistrationResponse)
def cancel_owner_registration(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    venue_count = db.query(models.Venue).filter_by(owner_id=current_user.id, is_active=True).count()
    if venue_count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Hãy gỡ tất cả sân đang hoạt động trước khi hủy đăng ký chủ sân",
        )
    if current_user.owner_status != "registered":
        raise HTTPException(status_code=409, detail="Tài khoản chưa đăng ký làm chủ sân")
    current_user.owner_status = "none"
    db.commit()
    return {"owner_status": current_user.owner_status, "owned_venues_count": 0}


@router.get("/venues", response_model=List[schemas.OwnerVenueResponse])
def list_my_venues(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    return [
        _venue_payload(venue)
        for venue in db.query(models.Venue).filter_by(owner_id=current_user.id, is_active=True)
        .order_by(models.Venue.id.desc()).all()
    ]


@router.post("/venues", response_model=schemas.OwnerVenueResponse, status_code=status.HTTP_201_CREATED)
def create_my_venue(
    data: schemas.OwnerVenueCreate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    if current_user.owner_status != "registered":
        raise HTTPException(status_code=403, detail="Bạn cần đăng ký chủ sân trước")
    latitude, longitude = data.latitude, data.longitude
    if latitude is None or longitude is None:
        coordinates = geocode_address(data.address)
        if coordinates:
            latitude, longitude = coordinates
    sport = _resolve_sport(db, data.sport_id)
    venue = models.Venue(
        name=data.name.strip(),
        address=data.address.strip(),
        latitude=latitude,
        longitude=longitude,
        description=data.description,
        owner_id=current_user.id,
        sport_key=data.sport_id,
        price_label=data.price_label.strip(),
        court_count=data.court_count,
        facilities=data.facilities,
        image_url=data.image_url,
        is_active=True,
    )
    db.add(venue)
    db.flush()
    _update_courts(db, venue, sport, data.court_count, _price_per_hour(data.price_label))
    db.commit()
    db.refresh(venue)
    return _venue_payload(venue)


@router.put("/venues/{venue_id}", response_model=schemas.OwnerVenueResponse)
def update_my_venue(
    venue_id: int,
    data: schemas.OwnerVenueUpdate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    venue = _owned_venue(db, venue_id, current_user.id)
    changes = data.model_dump(exclude_unset=True)
    sport_key = changes.pop("sport_id", venue.sport_key)
    price_label = changes.get("price_label", venue.price_label or "50.000đ")
    count = changes.get("court_count", venue.court_count)
    for key, value in changes.items():
        if key in {"name", "address"} and value is not None:
            value = value.strip()
        if key in {"price_label", "court_count", "facilities", "description", "latitude", "longitude", "image_url", "name", "address"}:
            setattr(venue, key, value)
    if "address" in changes and ("latitude" not in changes or "longitude" not in changes):
        coordinates = geocode_address(venue.address)
        if coordinates:
            venue.latitude, venue.longitude = coordinates
    sport = _resolve_sport(db, sport_key)
    venue.sport_key = sport_key
    _update_courts(db, venue, sport, count, _price_per_hour(price_label))
    db.commit()
    db.refresh(venue)
    return _venue_payload(venue)


@router.delete("/venues/{venue_id}", response_model=schemas.OwnerVenueResponse)
def remove_my_venue(
    venue_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    venue = _owned_venue(db, venue_id, current_user.id)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    upcoming_booking = db.query(models.Booking.id).join(
        models.Court, models.Court.id == models.Booking.court_id
    ).filter(
        models.Court.venue_id == venue.id,
        func.lower(func.coalesce(models.Booking.status, "")) != "cancelled",
        models.Booking.end_time > now,
    ).first()
    upcoming_external = db.query(models.VenueReservationBlock.id).filter(
        models.VenueReservationBlock.venue_id == venue.id,
        models.VenueReservationBlock.end_time > now,
    ).first()
    if upcoming_booking or upcoming_external:
        raise HTTPException(status_code=409, detail="Hãy xử lý hết lịch đặt sắp tới trên sân trước khi gỡ sân")
    venue.is_active = False
    for court in db.query(models.Court).filter_by(venue_id=venue.id, is_active=True).all():
        court.is_active = False
    db.commit()
    db.refresh(venue)
    return _venue_payload(venue)


@router.get("/venues/{venue_id}/schedule", response_model=List[schemas.OwnerScheduleItem])
def get_my_venue_schedule(
    venue_id: int,
    day: date = Query(..., alias="date"),
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    venue = _owned_venue(db, venue_id, current_user.id)
    start = datetime.combine(day, time.min, tzinfo=ZoneInfo("Asia/Ho_Chi_Minh")).astimezone(
        ZoneInfo("UTC")
    ).replace(tzinfo=None)
    end = start + timedelta(days=1)
    app_bookings = db.query(models.Booking, models.Court.name).join(
        models.Court, models.Court.id == models.Booking.court_id
    ).filter(
        models.Court.venue_id == venue.id,
        models.Booking.start_time < end,
        models.Booking.end_time > start,
        func.lower(func.coalesce(models.Booking.status, "")) != "cancelled",
    ).all()
    external_blocks = db.query(models.VenueReservationBlock, models.Court.name).join(
        models.Court, models.Court.id == models.VenueReservationBlock.court_id
    ).filter(
        models.VenueReservationBlock.venue_id == venue.id,
        models.VenueReservationBlock.start_time < end,
        models.VenueReservationBlock.end_time > start,
    ).all()
    items = [
        {
            "id": booking.id,
            "court_id": booking.court_id,
            "court_name": court_name,
            "start_time": booking.start_time,
            "end_time": booking.end_time,
            "kind": "app",
            "status": booking.status,
        }
        for booking, court_name in app_bookings
    ] + [
        {
            "id": block.id,
            "court_id": block.court_id,
            "court_name": court_name,
            "start_time": block.start_time,
            "end_time": block.end_time,
            "kind": "external",
            "status": "blocked",
            "note": block.note,
        }
        for block, court_name in external_blocks
    ]
    return sorted(items, key=lambda item: item["start_time"])


@router.post(
    "/venues/{venue_id}/schedule/blocks",
    response_model=schemas.OwnerScheduleItem,
    status_code=status.HTTP_201_CREATED,
)
def create_external_reservation_block(
    venue_id: int,
    data: schemas.OwnerReservationBlockCreate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    venue = _owned_venue(db, venue_id, current_user.id)
    court = db.query(models.Court).filter(
        models.Court.id == data.court_id,
        models.Court.venue_id == venue.id,
        models.Court.is_active.is_(True),
    ).with_for_update().first()
    if not court:
        raise HTTPException(status_code=404, detail="Không tìm thấy sân con đang hoạt động")
    if data.start_time <= datetime.now(timezone.utc).replace(tzinfo=None):
        raise HTTPException(status_code=400, detail="Không thể ghi nhận lịch đã bắt đầu")

    booking_conflict = db.query(models.Booking.id).filter(
        models.Booking.court_id == court.id,
        func.lower(func.coalesce(models.Booking.status, "")) != "cancelled",
        models.Booking.start_time < data.end_time,
        models.Booking.end_time > data.start_time,
    ).first()
    block_conflict = db.query(models.VenueReservationBlock.id).filter(
        models.VenueReservationBlock.court_id == court.id,
        models.VenueReservationBlock.start_time < data.end_time,
        models.VenueReservationBlock.end_time > data.start_time,
    ).first()
    if booking_conflict or block_conflict:
        raise HTTPException(status_code=409, detail="Khung giờ này đã có lịch; không thể ghi đè")

    block = models.VenueReservationBlock(
        venue_id=venue.id,
        court_id=court.id,
        created_by=current_user.id,
        start_time=data.start_time,
        end_time=data.end_time,
        note=data.note.strip() if data.note else None,
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    return {
        "id": block.id,
        "court_id": court.id,
        "court_name": court.name,
        "start_time": block.start_time,
        "end_time": block.end_time,
        "kind": "external",
        "status": "blocked",
        "note": block.note,
    }


@router.delete("/venues/{venue_id}/schedule/blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_external_reservation_block(
    venue_id: int,
    block_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _owned_venue(db, venue_id, current_user.id)
    block = db.query(models.VenueReservationBlock).filter_by(
        id=block_id, venue_id=venue_id, created_by=current_user.id
    ).first()
    if not block:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch đặt ngoài hệ thống")
    db.delete(block)
    db.commit()
