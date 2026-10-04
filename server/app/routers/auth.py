import os
import secrets
import requests
import logging
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

logger = logging.getLogger(__name__)


def _delete_user_media(user_id: int) -> None:
    """Best-effort cleanup of objects uploaded under the user's storage prefix."""
    try:
        from app.routers.storage import _storage_config
        client, bucket = _storage_config()
        prefix = f"sportgo/{user_id}/"
        response = client.list_objects_v2(Bucket=bucket, Prefix=prefix)
        keys = [{"Key": item["Key"]} for item in response.get("Contents", [])]
        if keys:
            client.delete_objects(Bucket=bucket, Delete={"Objects": keys, "Quiet": True})
    except Exception:
        # Account deletion must still complete when an old storage installation is unavailable.
        logger.warning("Could not clean uploaded media for deleted user %s", user_id, exc_info=True)

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
    if not user or user.status != "active" or not auth_utils.verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Generate access token
    access_token = auth_utils.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


def _complete_google_login(claims: dict, db: Session, accepted_terms: bool = False) -> dict:
    """Find or create the SportGo user for verified Google ID-token claims and issue an access token."""
    subject = claims.get("sub")
    email = (claims.get("email") or "").strip().lower()
    if not subject or not email or claims.get("email_verified") is not True:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google chưa xác minh địa chỉ email này")

    is_new_user = False
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
            if not accepted_terms:
                raise HTTPException(
                    status_code=status.HTTP_428_PRECONDITION_REQUIRED,
                    detail="Vui lòng chấp nhận quy tắc cộng đồng trước khi tạo tài khoản",
                )
            from app.auth_utils import get_password_hash
            user = models.User(email=email, password_hash=get_password_hash(secrets.token_urlsafe(32)))
            is_new_user = True
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
            is_new_user = False
            identity = db.query(models.OAuthIdentity).filter_by(provider="google", subject=subject).first()
            if not identity:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tài khoản Google vừa được liên kết. Vui lòng thử lại")
            user = db.query(models.User).filter_by(id=identity.user_id).first()

    if not user or user.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản SportGo này hiện không thể đăng nhập")

    access_token = auth_utils.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "is_new_user": is_new_user}


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

    return _complete_google_login(claims, db, login_data.accepted_terms)

@router.post("/google/mobile", response_model=schemas.Token)
def login_with_google_mobile(login_data: schemas.GoogleMobileLoginRequest, db: Session = Depends(database.get_db)):
    """Sign in from the mobile app: the app completes Google's OAuth (PKCE) itself and sends the ID token."""
    # Accept tokens issued for the mobile OAuth clients and for our web client (the audience a native
    # Google Sign-In ID token carries when the app passes the web client as its server client ID).
    audiences = [
        item.strip()
        for item in [*os.getenv("GOOGLE_MOBILE_CLIENT_IDS", "").split(","), os.getenv("GOOGLE_CLIENT_ID", "")]
        if item.strip()
    ]
    if not audiences:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Đăng nhập Google trên di động chưa được cấu hình")

    try:
        claims = id_token.verify_oauth2_token(login_data.id_token, GoogleRequest(), audience=audiences)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Thông tin đăng nhập Google không hợp lệ")
    except (GoogleAuthError, TransportError):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Không thể xác minh với Google lúc này")

    return _complete_google_login(claims, db, login_data.accepted_terms)


@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(register_data: schemas.UserCreate, db: Session = Depends(database.get_db)):
    if not register_data.accepted_terms:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Vui lòng chấp nhận quy tắc cộng đồng trước khi tạo tài khoản",
        )
    user = crud.get_user_by_email(db, email=register_data.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email này đã được đăng ký sử dụng"
        )
        
    user = crud.create_user(db, user=register_data)
    db.add(models.UserPolicyAcceptance(user_id=user.id))
    db.commit()
    access_token = auth_utils.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "is_new_user": True}


@router.post("/accept-terms")
def accept_community_guidelines(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    acceptance = db.query(models.UserPolicyAcceptance).filter_by(user_id=current_user.id).first()
    if not acceptance:
        db.add(models.UserPolicyAcceptance(user_id=current_user.id))
        db.commit()
    return {"accepted": True}


def _delete_user_data(db: Session, user_id: int) -> None:
    """Delete account-owned data before removing the user row.

    The project uses PostgreSQL in production, but this explicit ordering also keeps deletion predictable
    for existing installations whose older foreign keys do not all have ON DELETE CASCADE yet.
    """
    _delete_user_media(user_id)
    # Records that can reference the user in more than one role.
    db.query(models.ContentReport).filter(
        (models.ContentReport.reporter_id == user_id) | (models.ContentReport.reviewed_by == user_id)
    ).delete(synchronize_session=False)
    db.query(models.AccountDeletionRequest).filter(
        (models.AccountDeletionRequest.user_id == user_id) | (models.AccountDeletionRequest.processed_by == user_id)
    ).delete(synchronize_session=False)
    db.query(models.UserBlock).filter(
        (models.UserBlock.blocker_id == user_id) | (models.UserBlock.blocked_id == user_id)
    ).delete(synchronize_session=False)
    db.query(models.UserPolicyAcceptance).filter_by(user_id=user_id).delete(synchronize_session=False)
    db.query(models.Notification).filter(
        (models.Notification.recipient_id == user_id) | (models.Notification.actor_id == user_id)
    ).delete(synchronize_session=False)
    db.query(models.ModerationWarning).filter(
        (models.ModerationWarning.recipient_id == user_id) | (models.ModerationWarning.admin_id == user_id)
    ).delete(synchronize_session=False)

    # Conversations and messages are private account data and are removed together.
    conversation_ids = [row[0] for row in db.query(models.Conversation.id).filter(
        (models.Conversation.user1_id == user_id) | (models.Conversation.user2_id == user_id)
    ).all()]
    if conversation_ids:
        db.query(models.Message).filter(models.Message.conversation_id.in_(conversation_ids)).delete(synchronize_session=False)
        db.query(models.Conversation).filter(models.Conversation.id.in_(conversation_ids)).delete(synchronize_session=False)
    db.query(models.Message).filter_by(sender_id=user_id).delete(synchronize_session=False)
    db.query(models.Friendship).filter(
        (models.Friendship.user_low_id == user_id)
        | (models.Friendship.user_high_id == user_id)
        | (models.Friendship.requester_id == user_id)
    ).delete(synchronize_session=False)

    # User-generated content and its dependent rows.
    db.query(models.SocialPostCommentReaction).filter_by(user_id=user_id).delete(synchronize_session=False)
    db.query(models.SocialPostLike).filter_by(user_id=user_id).delete(synchronize_session=False)
    db.query(models.SocialPostComment).filter_by(author_id=user_id).delete(synchronize_session=False)
    db.query(models.SocialPost).filter_by(author_id=user_id).delete(synchronize_session=False)
    db.query(models.LfgPostParticipant).filter_by(user_id=user_id).delete(synchronize_session=False)
    lfg_ids = [row[0] for row in db.query(models.LfgPost.id).filter_by(author_id=user_id).all()]
    if lfg_ids:
        db.query(models.LfgPostParticipant).filter(models.LfgPostParticipant.post_id.in_(lfg_ids)).delete(synchronize_session=False)
        db.query(models.LfgPost).filter(models.LfgPost.id.in_(lfg_ids)).delete(synchronize_session=False)

    # Bookings, rooms, teams and venues created/owned by the account.
    db.query(models.Booking).filter_by(user_id=user_id).delete(synchronize_session=False)
    db.query(models.VenueReservationBlock).filter_by(created_by=user_id).delete(synchronize_session=False)
    match_ids = [row[0] for row in db.query(models.Match.id).filter_by(host_id=user_id).all()]
    if match_ids:
        db.query(models.MatchParticipant).filter(models.MatchParticipant.match_id.in_(match_ids)).delete(synchronize_session=False)
        db.query(models.Match).filter(models.Match.id.in_(match_ids)).delete(synchronize_session=False)
    db.query(models.MatchParticipant).filter_by(user_id=user_id).delete(synchronize_session=False)
    db.query(models.TeamReview).filter_by(user_id=user_id).delete(synchronize_session=False)
    db.query(models.TeamMembership).filter_by(user_id=user_id).delete(synchronize_session=False)
    team_ids = [row[0] for row in db.query(models.Team.id).filter_by(owner_id=user_id).all()]
    if team_ids:
        db.query(models.TeamReview).filter(models.TeamReview.team_id.in_(team_ids)).delete(synchronize_session=False)
        db.query(models.TeamMembership).filter(models.TeamMembership.team_id.in_(team_ids)).delete(synchronize_session=False)
        db.query(models.Team).filter(models.Team.id.in_(team_ids)).delete(synchronize_session=False)
    venue_ids = [row[0] for row in db.query(models.Venue.id).filter_by(owner_id=user_id).all()]
    if venue_ids:
        db.query(models.Venue).filter(models.Venue.id.in_(venue_ids)).delete(synchronize_session=False)

    db.query(models.PremiumPayment).filter_by(user_id=user_id).delete(synchronize_session=False)
    db.query(models.RoomSearchPreference).filter_by(user_id=user_id).delete(synchronize_session=False)
    db.query(models.OAuthIdentity).filter_by(user_id=user_id).delete(synchronize_session=False)
    db.query(models.UserSport).filter_by(user_id=user_id).delete(synchronize_session=False)
    db.query(models.UserProfile).filter_by(user_id=user_id).delete(synchronize_session=False)
    db.query(models.User).filter_by(id=user_id).delete(synchronize_session=False)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_account(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    if current_user.is_admin:
        raise HTTPException(status_code=403, detail="Tài khoản quản trị cần được xử lý trong trung tâm quản trị")
    _delete_user_data(db, current_user.id)
    db.commit()
    return None


@router.post("/account-deletion-requests", response_model=schemas.AccountDeletionRequestResponse, status_code=status.HTTP_202_ACCEPTED)
def request_account_deletion(
    data: schemas.AccountDeletionRequestCreate,
    db: Session = Depends(database.get_db),
):
    user = crud.get_user_by_email(db, data.email)
    db.add(models.AccountDeletionRequest(
        email=data.email,
        user_id=user.id if user else None,
        reason=data.reason,
    ))
    db.commit()
    # Deliberately do not reveal whether an account exists at this email.
    return {"message": "Yêu cầu đã được ghi nhận. SportGo sẽ xử lý việc xoá dữ liệu liên quan đến tài khoản."}

@router.post("/logout")
def logout(credentials = Depends(auth_utils.security), db: Session = Depends(database.get_db)):
    token = credentials.credentials
    auth_utils.blacklist_token(db, token)
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=schemas.UserResponse)
def get_me(
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    response = schemas.UserResponse.model_validate(current_user)
    attendance_by_sport = db.query(
        models.Match.sport_id,
        func.count(models.MatchParticipant.id),
    ).join(
        models.MatchParticipant,
        models.MatchParticipant.match_id == models.Match.id,
    ).filter(
        models.MatchParticipant.user_id == current_user.id,
        models.MatchParticipant.status == "APPROVED",
        models.MatchParticipant.attendance_status == "ATTENDED",
    ).group_by(models.Match.sport_id).all()
    confirmed_counts = {sport_id: int(count) for sport_id, count in attendance_by_sport}
    for user_sport in response.sports:
        user_sport.games_played = int(user_sport.games_played or 0) + confirmed_counts.get(user_sport.sport_id, 0)
    return response


@router.get("/me/stats", response_model=schemas.UserStatsResponse)
def get_my_stats(
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    legacy_games_by_sport = db.query(
        models.UserSport.sport_id,
        func.coalesce(func.sum(models.UserSport.games_played), 0),
    ).filter(
        models.UserSport.user_id == current_user.id,
    ).group_by(models.UserSport.sport_id).all()
    confirmed_games_by_sport = db.query(
        models.Match.sport_id,
        func.count(models.MatchParticipant.id),
    ).join(
        models.MatchParticipant,
        models.MatchParticipant.match_id == models.Match.id,
    ).filter(
        models.MatchParticipant.user_id == current_user.id,
        models.MatchParticipant.status == "APPROVED",
        models.MatchParticipant.attendance_status == "ATTENDED",
    ).group_by(models.Match.sport_id).all()
    games_by_sport = {sport_id: int(count) for sport_id, count in legacy_games_by_sport}
    for sport_id, count in confirmed_games_by_sport:
        games_by_sport[sport_id] = games_by_sport.get(sport_id, 0) + int(count)
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
        "games_played": sum(games_by_sport.values()),
        "games_by_sport": games_by_sport,
        "teams_joined": teams_joined,
        "bookings_count": bookings_count,
        "average_skill_rating": round(float(average_rating), 1) if average_rating is not None else None,
    }

@router.put("/me", response_model=schemas.UserResponse)
def update_me(profile_data: schemas.UserProfileWithSportsUpdate, current_user = Depends(auth_utils.get_current_user), db: Session = Depends(database.get_db)):
    updated_user = crud.update_user_profile_with_sports(db, current_user.id, profile_data)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return get_me(current_user=updated_user, db=db)
