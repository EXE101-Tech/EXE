from sqlalchemy.orm import Session
from app import models, schemas

def create_booking(db: Session, user_id: int, booking: schemas.BookingCreate, total_price: int):
    db_booking = models.Booking(
        court_id=booking.court_id,
        user_id=user_id,
        start_time=booking.start_time,
        end_time=booking.end_time,
        total_price=total_price,
        status="confirmed"
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking

def get_bookings(db: Session, user_id: int = None):
    query = db.query(models.Booking)
    if user_id:
        query = query.filter(models.Booking.user_id == user_id)
    return query.all()

def get_booking_by_id(db: Session, booking_id: int):
    return db.query(models.Booking).filter(models.Booking.id == booking_id).first()

def cancel_booking(db: Session, booking_id: int):
    db_booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if db_booking:
        db_booking.status = "cancelled"
        db.commit()
        db.refresh(db_booking)
    return db_booking
