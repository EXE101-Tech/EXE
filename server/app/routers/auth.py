import os
import secrets
import requests
from fastapi import APIRouter, Depends, HTTPException, status, Request
from google.auth.exceptions import GoogleAuthError, TransportError
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
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


@router.post("/google", response_model=schemas.Token)
def login_with_google(request: Request, login_data: schemas.GoogleLoginRequest, db: Session = Depends(database.get_db)):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Đăng nhập Google chưa được cấu hình")

    if request.headers.get("X-Requested-With") != "XmlHttpRequest":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Yêu cầu đăng nhập Google không hợp lệ")

    origin = (request.headers.get("origin") or "").rstrip("/")
    allowed_origins = {
        item.strip().rstrip("/")
        for item in os.getenv(
            "GOOGLE_ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if item.strip()
    }
    if not origin or origin not in allowed_origins:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nguồn đăng nhập Google không được phép")

    try:
        token_response = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": login_data.code,
                "grant_type": "authorization_code",
                "redirect_uri": origin,
            },
            timeout=10,
        )
    except requests.RequestException:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Không thể kết nối với Google lúc này")

    try:
        token_data = token_response.json()
    except ValueError:
        token_data = {}
    google_id_token = token_data.get("id_token") if token_response.ok else None
    if not google_id_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Mã đăng nhập Google không hợp lệ hoặc đã hết hạn")

    try:
        claims = id_token.verify_oauth2_token(google_id_token, GoogleRequest(), audience=client_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Thông tin đăng nhập Google không hợp lệ")
    except (GoogleAuthError, TransportError):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Không thể xác minh với Google lúc này")

    subject = claims.get("sub")
    email = (claims.get("email") or "").strip().lower()
    if not subject or not email or claims.get("email_verified") is not True:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google chưa xác minh địa chỉ email này")

    identity = db.query(models.OAuthIdentity).filter_by(provider="google", subject=subject).first()
    if identity:
        user = db.query(models.User).filter_by(id=identity.user_id).first()
    else:
        user = db.query(models.User).filter(func.lower(models.User.email) == email).first()
        if user and user.status != "active":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản SportGo này hiện không thể đăng nhập")

        if user:
            linked_identity = db.query(models.OAuthIdentity).filter_by(user_id=user.id, provider="google").first()
            if linked_identity and linked_identity.subject != subject:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tài khoản SportGo này đã liên kết với một tài khoản Google khác")
        else:
            from app.auth_utils import get_password_hash
            user = models.User(email=email, password_hash=get_password_hash(secrets.token_urlsafe(32)))
            db.add(user)
            db.flush()
            db.add(models.UserProfile(
                user_id=user.id,
                full_name=claims.get("name") or email.split("@", 1)[0],
                avatar_url=claims.get("picture"),
            ))

        if not db.query(models.OAuthIdentity).filter_by(user_id=user.id, provider="google").first():
            db.add(models.OAuthIdentity(user_id=user.id, provider="google", subject=subject))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            identity = db.query(models.OAuthIdentity).filter_by(provider="google", subject=subject).first()
            if not identity:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tài khoản Google vừa được liên kết. Vui lòng thử lại")
            user = db.query(models.User).filter_by(id=identity.user_id).first()

    if not user or user.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản SportGo này hiện không thể đăng nhập")

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
