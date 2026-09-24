from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app import database, schemas, crud, auth_utils, models
from datetime import datetime, timezone, timedelta
from sqlalchemy import func

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

def check_rate_limit(db: Session, ip: str) -> bool:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    # Cleanup attempts older than 24 hours to keep database size bounded
    db.query(models.LoginAttempt).filter(
        models.LoginAttempt.attempted_at < now - timedelta(hours=24)
    ).delete()
    
    # Check attempts in last 60 seconds
    one_minute_ago = now - timedelta(seconds=60)
    count = db.query(models.LoginAttempt).filter(
        models.LoginAttempt.ip == ip,
        models.LoginAttempt.attempted_at >= one_minute_ago
    ).count()
    
    if count >= 5:
        db.commit()
        return False
        
    # Log current attempt
    attempt = models.LoginAttempt(ip=ip, attempted_at=now)
    db.add(attempt)
    db.commit()
    return True

@router.post("/login", response_model=schemas.Token)
def login(request: Request, login_data: schemas.UserLogin, db: Session = Depends(database.get_db)):
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(db, ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau."
        )
        
    user = crud.get_user_by_email(db, email=login_data.email)
    if not user or not auth_utils.verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Generate access token
    access_token = auth_utils.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(register_data: schemas.UserCreate, db: Session = Depends(database.get_db)):
    user = crud.get_user_by_email(db, email=register_data.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email này đã được đăng ký sử dụng"
        )
        
    user = crud.create_user(db, user=register_data)
    access_token = auth_utils.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
def logout(credentials = Depends(auth_utils.security), db: Session = Depends(database.get_db)):
    token = credentials.credentials
    auth_utils.blacklist_token(db, token)
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user = Depends(auth_utils.get_current_user)):
    return current_user


@router.get("/me/stats", response_model=schemas.UserStatsResponse)
def get_my_stats(
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    games_played = db.query(func.coalesce(func.sum(models.UserSport.games_played), 0)).filter(
        models.UserSport.user_id == current_user.id
    ).scalar()
    teams_joined = db.query(models.TeamMembership).filter_by(
        user_id=current_user.id, status="APPROVED"
    ).count()
    bookings_count = db.query(models.Booking).filter(
        models.Booking.user_id == current_user.id,
        func.lower(func.coalesce(models.Booking.status, "")) != "cancelled",
    ).count()
    average_rating = db.query(func.avg(models.UserSport.rating)).filter(
        models.UserSport.user_id == current_user.id
    ).scalar()
    return {
        "games_played": int(games_played or 0),
        "teams_joined": teams_joined,
        "bookings_count": bookings_count,
        "average_skill_rating": round(float(average_rating), 1) if average_rating is not None else None,
    }

@router.put("/me", response_model=schemas.UserResponse)
def update_me(profile_data: schemas.UserProfileWithSportsUpdate, current_user = Depends(auth_utils.get_current_user), db: Session = Depends(database.get_db)):
    updated_user = crud.update_user_profile_with_sports(db, current_user.id, profile_data)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user
