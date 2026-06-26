from sqlalchemy.orm import Session
from app import models, schemas

def get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    from app.auth_utils import get_password_hash
    hashed_password = get_password_hash(user.password)
    db_user = models.User(email=user.email, password_hash=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create profile with user's name
    db_profile = models.UserProfile(user_id=db_user.id, full_name=user.name)
    db.add(db_profile)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_profile(db: Session, user_id: int, profile_update: schemas.UserProfileUpdate):
    db_profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == user_id).first()
    if not db_profile:
        return None
    for key, value in profile_update.dict(exclude_unset=True).items():
        setattr(db_profile, key, value)
    db.commit()
    db.refresh(db_profile)
    return db_profile

def update_user_profile_with_sports(db: Session, user_id: int, data: schemas.UserProfileWithSportsUpdate):
    db_profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == user_id).first()
    if db_profile and data.name is not None:
        db_profile.full_name = data.name
        
    if data.sports is not None:
        for sport_name, skill_level in data.sports.items():
            sport = db.query(models.Sport).filter(models.Sport.name == sport_name).first()
            if sport:
                user_sport = db.query(models.UserSport).filter(
                    models.UserSport.user_id == user_id, 
                    models.UserSport.sport_id == sport.id
                ).first()
                if user_sport:
                    user_sport.skill_level = skill_level
                else:
                    user_sport = models.UserSport(user_id=user_id, sport_id=sport.id, skill_level=skill_level)
                    db.add(user_sport)
    
    db.commit()
    return get_user_by_id(db, user_id)
