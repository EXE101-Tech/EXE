from sqlalchemy.orm import Session
from app import models, schemas
import math

def get_sports(db: Session):
    return db.query(models.Sport).all()

def create_sport(db: Session, name: str, icon_url: str = None):
    db_sport = models.Sport(name=name, icon_url=icon_url)
    db.add(db_sport)
    db.commit()
    db.refresh(db_sport)
    return db_sport

def add_user_sport(db: Session, user_id: int, user_sport: schemas.UserSportCreate):
    db_user_sport = models.UserSport(
        user_id=user_id,
        sport_id=user_sport.sport_id,
        skill_level=user_sport.skill_level,
    )
    db.add(db_user_sport)
    db.commit()
    db.refresh(db_user_sport)
    return db_user_sport

def get_venues(db: Session):
    return db.query(models.Venue).all()

def get_venue_by_id(db: Session, venue_id: int):
    return db.query(models.Venue).filter(models.Venue.id == venue_id).first()

def create_venue(db: Session, venue: schemas.VenueCreate, owner_id: int = None):
    db_venue = models.Venue(
        name=venue.name,
        address=venue.address,
        latitude=venue.latitude,
        longitude=venue.longitude,
        description=venue.description,
        owner_id=owner_id
    )
    db.add(db_venue)
    db.commit()
    db.refresh(db_venue)
    return db_venue

def get_court_by_id(db: Session, court_id: int):
    return db.query(models.Court).filter(models.Court.id == court_id).first()

def get_courts(db: Session, venue_id: int = None, sport_id: int = None):
    query = db.query(models.Court)
    if venue_id:
        query = query.filter(models.Court.venue_id == venue_id)
    if sport_id:
        query = query.filter(models.Court.sport_id == sport_id)
    return query.all()

def create_court(db: Session, court: schemas.CourtCreate):
    db_court = models.Court(
        venue_id=court.venue_id,
        name=court.name,
        sport_id=court.sport_id,
        price_per_hour=court.price_per_hour
    )
    db.add(db_court)
    db.commit()
    db.refresh(db_court)
    return db_court

def get_nearby_venues(db: Session, lat: float, lng: float, radius: float):
    # Bounding box coordinates calculation to reduce database scan load
    lat_deg_per_km = 1.0 / 111.0
    lng_deg_per_km = 1.0 / (111.0 * math.cos(math.radians(lat)))
    lat_delta = radius * lat_deg_per_km
    lng_delta = radius * lng_deg_per_km
    
    venues = db.query(models.Venue).filter(
        models.Venue.latitude.between(lat - lat_delta, lat + lat_delta),
        models.Venue.longitude.between(lng - lng_delta, lng + lng_delta)
    ).all()
    
    nearby = []
    for venue in venues:
        # Distance calculation
        R = 6371.0 # Radius of Earth in km
        lat1 = math.radians(lat)
        lng1 = math.radians(lng)
        lat2 = math.radians(venue.latitude)
        lng2 = math.radians(venue.longitude)
        
        dlon = lng2 - lng1
        dlat = lat2 - lat1
        a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance = R * c
        
        if distance <= radius:
            nearby.append(venue)
            
    return nearby
