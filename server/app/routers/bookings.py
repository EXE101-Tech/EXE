from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List
from app import database, schemas, crud, auth_utils, models

router = APIRouter(
    prefix="/bookings",
    tags=["Bookings"]
)

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
    # Verify court exists
    court = crud.get_court_by_id(db, court_id=booking_data.court_id)
    if not court:
        raise HTTPException(status_code=404, detail="Court not found")
        
    # Check for booking conflicts
    overlapping_booking = db.query(models.Booking).filter(
        models.Booking.court_id == booking_data.court_id,
        models.Booking.status != "cancelled",
        models.Booking.start_time < booking_data.end_time,
        models.Booking.end_time > booking_data.start_time
    ).first()
    
    if overlapping_booking:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sân đã được đặt trong khoảng thời gian này"
        )
        
    # Calculate price dynamically
    duration = (booking_data.end_time - booking_data.start_time).total_seconds() / 3600.0
    total_price = int(round(duration * court.price_per_hour))
    
    return crud.create_booking(db, user_id=current_user.id, booking=booking_data, total_price=total_price)

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

