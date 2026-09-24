from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app import database, schemas, crud, auth_utils, models

router = APIRouter(
    prefix="/bookings",
    tags=["Bookings"]
)


def _create_bookings_atomically(db: Session, user_id: int, requests: list[schemas.BookingCreate]):
    court_ids = sorted({request.court_id for request in requests})
    courts = db.query(models.Court).join(models.Venue).filter(
        models.Court.id.in_(court_ids),
        models.Court.is_active.is_(True),
        models.Venue.is_active.is_(True),
    ).order_by(models.Court.id.asc()).with_for_update().all()
    court_by_id = {court.id: court for court in courts}
    if len(court_by_id) != len(court_ids):
        raise HTTPException(status_code=404, detail="Một hoặc nhiều sân không còn hoạt động")

    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    for request in requests:
        if request.start_time <= now_utc:
            raise HTTPException(status_code=400, detail="Không thể đặt khung giờ đã bắt đầu")
        overlap = db.query(models.Booking.id).filter(
            models.Booking.court_id == request.court_id,
            func.lower(func.coalesce(models.Booking.status, "")) != "cancelled",
            models.Booking.start_time < request.end_time,
            models.Booking.end_time > request.start_time,
        ).first()
        if overlap:
            raise HTTPException(status_code=409, detail="Sân vừa được đặt trong khung giờ bạn chọn. Hãy tải lại lịch.")
        external_block = db.query(models.VenueReservationBlock.id).filter(
            models.VenueReservationBlock.court_id == request.court_id,
            models.VenueReservationBlock.start_time < request.end_time,
            models.VenueReservationBlock.end_time > request.start_time,
        ).first()
        if external_block:
            raise HTTPException(status_code=409, detail="Chủ sân đã ghi nhận lịch bên ngoài trong khung giờ này")

    ordered = sorted(requests, key=lambda item: (item.court_id, item.start_time))
    for previous, current in zip(ordered, ordered[1:]):
        if previous.court_id == current.court_id and previous.end_time > current.start_time:
            raise HTTPException(status_code=422, detail="Các khung giờ bạn chọn đang bị chồng lấn")

    records = []
    for request in requests:
        court = court_by_id[request.court_id]
        hours = (request.end_time - request.start_time).total_seconds() / 3600
        records.append(models.Booking(
            court_id=court.id,
            user_id=user_id,
            start_time=request.start_time,
            end_time=request.end_time,
            total_price=int(round(hours * court.price_per_hour)),
            status="confirmed",
        ))
    db.add_all(records)
    try:
        db.commit()
        for record in records:
            db.refresh(record)
        return records
    except Exception:
        db.rollback()
        raise

@router.get("", response_model=List[schemas.BookingResponse])
def get_user_bookings(
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db)
):
    return crud.get_bookings(db, user_id=current_user.id)

@router.post("", response_model=schemas.BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking_data: schemas.BookingCreate,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db)
):
    return _create_bookings_atomically(db, current_user.id, [booking_data])[0]


@router.post("/batch", response_model=List[schemas.BookingResponse], status_code=status.HTTP_201_CREATED)
def create_booking_batch(
    batch: schemas.BookingBatchCreate,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    return _create_bookings_atomically(db, current_user.id, batch.bookings)


@router.get("/availability", response_model=List[schemas.BookingAvailabilityItem])
def get_booking_availability(
    venue_id: int = Query(..., gt=0),
    day: date = Query(..., alias="date"),
    db: Session = Depends(database.get_db),
):
    venue = crud.get_venue_by_id(db, venue_id)
    if not venue:
        raise HTTPException(status_code=404, detail="Không tìm thấy sân")
    start = datetime.combine(day, time.min, tzinfo=ZoneInfo("Asia/Ho_Chi_Minh")).astimezone(
        ZoneInfo("UTC")
    ).replace(tzinfo=None)
    end = start + timedelta(days=1)
    records = db.query(
        models.Booking.court_id,
        models.Booking.start_time,
        models.Booking.end_time,
    ).join(models.Court, models.Court.id == models.Booking.court_id).filter(
        models.Court.venue_id == venue_id,
        models.Court.is_active.is_(True),
        models.Booking.start_time < end,
        models.Booking.end_time > start,
        func.lower(func.coalesce(models.Booking.status, "")) != "cancelled",
    ).order_by(models.Booking.start_time.asc()).all()
    blocks = db.query(
        models.VenueReservationBlock.court_id,
        models.VenueReservationBlock.start_time,
        models.VenueReservationBlock.end_time,
    ).join(models.Court, models.Court.id == models.VenueReservationBlock.court_id).filter(
        models.Court.venue_id == venue_id,
        models.Court.is_active.is_(True),
        models.VenueReservationBlock.start_time < end,
        models.VenueReservationBlock.end_time > start,
    ).order_by(models.VenueReservationBlock.start_time.asc()).all()
    return [
        {"court_id": item.court_id, "start_time": item.start_time, "end_time": item.end_time}
        for item in records
    ] + [
        {"court_id": item.court_id, "start_time": item.start_time, "end_time": item.end_time}
        for item in blocks
    ]

@router.get("/{id}", response_model=schemas.BookingResponse)
def get_booking_details(
    id: int,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db)
):
    booking = crud.get_booking_by_id(db, booking_id=id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    # Ensure current user owns this booking
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this booking")
        
    return booking

@router.patch("/{id}/cancel", response_model=schemas.BookingResponse)
def cancel_existing_booking(
    id: int,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db)
):
    booking = crud.get_booking_by_id(db, booking_id=id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    # Ensure current user owns this booking
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")
        
    if booking.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đơn đặt sân này đã bị hủy rồi"
        )
        
    return crud.cancel_booking(db, booking_id=id)

