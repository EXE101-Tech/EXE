import secrets
import string
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app import auth_utils, database, models, schemas
from app.notification_utils import create_notification, display_name
from app.routers.social import _post_payloads


router = APIRouter(tags=["Administration"])


def _ensure_member_payment(current_user: models.User) -> None:
    if current_user.is_admin:
        raise HTTPException(status_code=403, detail="Tài khoản quản trị không sử dụng gói Premium")


def _payment_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "SGP-" + "".join(secrets.choice(alphabet) for _ in range(12))


def _payment_payload(payment: models.PremiumPayment):
    user = payment.user
    profile = user.profile if user else None
    return {
        "id": payment.id,
        "user_id": payment.user_id,
        "user_email": user.email if user else "",
        "user_name": display_name(user),
        "payment_code": payment.payment_code,
        "amount": payment.amount,
        "proof_url": payment.proof_url,
        "status": payment.status,
        "submitted_at": payment.submitted_at,
        "reviewed_at": payment.reviewed_at,
        "review_note": payment.review_note,
    }


@router.post("/premium/payments/intents", response_model=schemas.PremiumPaymentIntentResponse, status_code=status.HTTP_201_CREATED)
def create_payment_intent(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Create a server-generated transfer code for one Premium month."""
    _ensure_member_payment(current_user)
    existing = db.query(models.PremiumPayment).filter(
        models.PremiumPayment.user_id == current_user.id,
        models.PremiumPayment.status == "PENDING",
        or_(models.PremiumPayment.proof_url.is_(None), models.PremiumPayment.proof_url == ""),
    ).order_by(models.PremiumPayment.submitted_at.desc()).first()
    if existing:
        return existing

    code = _payment_code()
    while db.query(models.PremiumPayment).filter_by(payment_code=code).first():
        code = _payment_code()
    payment = models.PremiumPayment(
        user_id=current_user.id,
        payment_code=code,
        amount=30000,
        proof_url="",
        status="PENDING",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.post("/premium/payments/{payment_id}/submit", response_model=schemas.PremiumPaymentResponse)
def submit_payment_proof(
    payment_id: int,
    data: schemas.PremiumPaymentSubmit,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _ensure_member_payment(current_user)
    payment = db.query(models.PremiumPayment).options(
        joinedload(models.PremiumPayment.user).joinedload(models.User.profile),
    ).filter_by(id=payment_id, user_id=current_user.id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã thanh toán")
    if payment.payment_code != data.payment_code:
        raise HTTPException(status_code=400, detail="Mã chuyển khoản không khớp")
    if not data.proof_url.startswith("/api/storage/media/"):
        raise HTTPException(status_code=422, detail="Ảnh chuyển khoản phải được tải lên SportGo")
    if payment.status == "APPROVED":
        raise HTTPException(status_code=409, detail="Giao dịch này đã được duyệt")
    payment.proof_url = data.proof_url
    payment.status = "PENDING"
    db.commit()
    db.refresh(payment)
    return _payment_payload(payment)


@router.get("/premium/payments/mine", response_model=list[schemas.PremiumPaymentResponse])
def list_my_payments(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _ensure_member_payment(current_user)
    payments = db.query(models.PremiumPayment).options(
        joinedload(models.PremiumPayment.user).joinedload(models.User.profile),
    ).filter_by(user_id=current_user.id).order_by(models.PremiumPayment.submitted_at.desc()).limit(20).all()
    return [_payment_payload(payment) for payment in payments]


@router.get("/admin/summary")
def admin_summary(
    current_user: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(database.get_db),
):
    return {
        "users": db.query(func.count(models.User.id)).filter(models.User.status != "deleted").scalar() or 0,
        "posts": db.query(func.count(models.SocialPost.id)).scalar() or 0,
        "teams": db.query(func.count(models.Team.id)).scalar() or 0,
        "rooms": db.query(func.count(models.Match.id)).scalar() or 0,
        "pending_payments": db.query(func.count(models.PremiumPayment.id)).filter(
            models.PremiumPayment.status == "PENDING",
            models.PremiumPayment.proof_url.is_not(None),
            models.PremiumPayment.proof_url != "",
            models.PremiumPayment.user.has(models.User.status != "deleted"),
        ).scalar() or 0,
    }


@router.get("/admin/posts", response_model=list[schemas.SocialPostResponse])
def list_all_posts(
    current_user: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(database.get_db),
):
    posts = db.query(models.SocialPost).options(
        joinedload(models.SocialPost.author).joinedload(models.User.profile),
    ).order_by(models.SocialPost.created_at.desc(), models.SocialPost.id.desc()).all()
    return _post_payloads(db, posts, current_user.id)


@router.get("/admin/rooms", response_model=list[schemas.MatchResponse])
def list_all_rooms(
    current_user: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(database.get_db),
):
    return db.query(models.Match).options(
        joinedload(models.Match.host).joinedload(models.User.profile),
        joinedload(models.Match.sport),
        joinedload(models.Match.participants).joinedload(models.MatchParticipant.user).joinedload(models.User.profile),
    ).order_by(models.Match.created_at.desc()).all()


@router.get("/admin/payments", response_model=list[schemas.PremiumPaymentResponse])
def list_payments(
    payment_status: Optional[str] = Query(None, alias="status", pattern="^(PENDING|APPROVED|REJECTED)$"),
    current_user: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(database.get_db),
):
    query = db.query(models.PremiumPayment).join(models.PremiumPayment.user).options(
        joinedload(models.PremiumPayment.user).joinedload(models.User.profile),
    ).filter(models.User.status != "deleted")
    if payment_status:
        query = query.filter(models.PremiumPayment.status == payment_status)
        if payment_status == "PENDING":
            query = query.filter(
                models.PremiumPayment.proof_url.is_not(None),
                models.PremiumPayment.proof_url != "",
            )
    return [_payment_payload(item) for item in query.order_by(models.PremiumPayment.submitted_at.desc()).limit(200).all()]


def _admin_premium_account_payload(user: models.User, payment: Optional[models.PremiumPayment] = None):
    return {
        "user_id": user.id,
        "user_email": user.email,
        "user_name": display_name(user),
        "premium_until": user.premium_until,
        "last_payment_code": payment.payment_code if payment else None,
        "last_payment_amount": payment.amount if payment else None,
        "last_payment_submitted_at": payment.submitted_at if payment else None,
        "last_payment_proof_url": payment.proof_url if payment else None,
        "last_payment_reviewed_at": payment.reviewed_at if payment else None,
    }


@router.get("/admin/premium/accounts", response_model=list[schemas.AdminPremiumAccountResponse])
def list_active_premium_accounts(
    current_user: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(database.get_db),
):
    users = db.query(models.User).options(
        joinedload(models.User.profile),
    ).filter(
        models.User.is_admin.is_(False),
        models.User.premium_until > models.utc_now_naive(),
    ).order_by(models.User.premium_until.desc()).all()
    if not users:
        return []
    user_ids = [user.id for user in users]
    latest_payments = {}
    for payment in db.query(models.PremiumPayment).filter(
        models.PremiumPayment.user_id.in_(user_ids),
        models.PremiumPayment.status == "APPROVED",
    ).order_by(models.PremiumPayment.submitted_at.desc(), models.PremiumPayment.id.desc()).all():
        latest_payments.setdefault(payment.user_id, payment)
    return [_admin_premium_account_payload(user, latest_payments.get(user.id)) for user in users]


@router.delete("/admin/premium/accounts/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_premium_account(
    user_id: int,
    current_user: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(database.get_db),
):
    user = db.query(models.User).options(joinedload(models.User.profile)).filter(
        models.User.id == user_id,
        models.User.is_admin.is_(False),
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản Premium")
    if not user.is_premium:
        raise HTTPException(status_code=409, detail="Tài khoản này không còn Premium đang hoạt động")
    user.premium_until = None
    create_notification(
        db,
        recipient_id=user.id,
        actor=current_user,
        notification_type="premium_revoked",
        title="Gói Premium đã được hủy kích hoạt",
        body="Quyền Premium của bạn đã được hủy kích hoạt bởi quản trị viên.",
        target_url="/premium",
        entity_type="user",
        entity_id=user.id,
    )
    db.commit()


@router.patch("/admin/payments/{payment_id}", response_model=schemas.PremiumPaymentResponse)
def review_payment(
    payment_id: int,
    data: schemas.PremiumPaymentReview,
    current_user: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(database.get_db),
):
    payment = db.query(models.PremiumPayment).options(
        joinedload(models.PremiumPayment.user).joinedload(models.User.profile),
    ).filter_by(id=payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch")
    if not payment.proof_url:
        raise HTTPException(status_code=409, detail="Người dùng chưa gửi ảnh chuyển khoản")
    payment.status = data.status
    payment.reviewed_by = current_user.id
    payment.reviewed_at = models.utc_now_naive()
    payment.review_note = data.review_note
    if data.status == "APPROVED":
        payment.user.premium_until = models.utc_now_naive() + timedelta(days=30)
    create_notification(
        db,
        recipient_id=payment.user_id,
        actor=current_user,
        notification_type="premium_payment_reviewed",
        title="Giao dịch Premium đã được xử lý",
        body=(
            "Giao dịch của bạn đã được duyệt. Premium đã được kích hoạt trong 30 ngày."
            if data.status == "APPROVED"
            else f"Giao dịch Premium chưa được duyệt{': ' + data.review_note if data.review_note else '.'}"
        ),
        target_url="/premium",
        entity_type="premium_payment",
        entity_id=payment.id,
    )
    db.commit()
    db.refresh(payment)
    return _payment_payload(payment)


@router.get("/admin/accounts", response_model=list[schemas.AdminAccountResponse])
def list_admin_accounts(
    current_user: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(database.get_db),
):
    return db.query(models.User).options(joinedload(models.User.profile)).filter(
        models.User.is_admin.is_(True),
        models.User.status != "deleted",
    ).order_by(models.User.created_at.asc()).all()


@router.delete("/admin/accounts/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_account(
    user_id: int,
    current_user: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(database.get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=409, detail="Không thể xóa tài khoản quản trị đang đăng nhập")
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.is_admin.is_(True),
        models.User.status != "deleted",
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản admin")
    user.status = "deleted"
    user.premium_until = None
    user.email = f"deleted-admin-{user.id}@invalid.sportgo.local"
    db.commit()


@router.get("/admin/users", response_model=list[schemas.AdminUserResponse])
def list_user_accounts(
    current_user: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(database.get_db),
):
    return db.query(models.User).options(
        joinedload(models.User.profile),
    ).filter(
        models.User.is_admin.is_(False),
        models.User.status != "deleted",
    ).order_by(models.User.created_at.desc()).limit(500).all()


@router.delete("/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_account(
    user_id: int,
    current_user: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(database.get_db),
):
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.is_admin.is_(False),
        models.User.status != "deleted",
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản người dùng")
    # Keep related posts and transactions auditable while making the account unusable.
    user.status = "deleted"
    user.premium_until = None
    user.email = f"deleted-{user.id}@invalid.sportgo.local"
    db.commit()


@router.post("/admin/accounts", response_model=schemas.AdminAccountResponse, status_code=status.HTTP_201_CREATED)
def create_admin_account(
    data: schemas.AdminAccountCreate,
    current_user: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(database.get_db),
):
    email = data.email.strip().lower()
    if db.query(models.User).filter(func.lower(models.User.email) == email).first():
        raise HTTPException(status_code=409, detail="Email này đã được sử dụng")
    user = models.User(
        email=email,
        password_hash=auth_utils.get_password_hash(data.password),
        status="active",
        is_admin=True,
    )
    db.add(user)
    db.flush()
    db.add(models.UserProfile(user_id=user.id, full_name=data.name.strip()))
    db.commit()
    db.refresh(user)
    return user


@router.post("/admin/warnings", response_model=schemas.ModerationWarningResponse, status_code=status.HTTP_201_CREATED)
def send_moderation_warning(
    data: schemas.ModerationWarningCreate,
    current_user: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(database.get_db),
):
    if data.target_type == "team":
        target = db.query(models.Team).filter_by(id=data.target_id).first()
        recipient_id = target.owner_id if target else None
        label = "CLB"
        url = "/team"
    else:
        target = db.query(models.Match).filter_by(id=data.target_id).first()
        recipient_id = target.host_id if target else None
        label = "phòng chơi"
        url = "/matches"
    if not target:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy {label}")
    if not recipient_id:
        raise HTTPException(status_code=409, detail=f"{label.capitalize()} chưa có người phụ trách")
    warning = models.ModerationWarning(
        admin_id=current_user.id,
        recipient_id=recipient_id,
        target_type=data.target_type,
        target_id=data.target_id,
        message=data.message.strip(),
    )
    db.add(warning)
    create_notification(
        db,
        recipient_id=recipient_id,
        actor=current_user,
        notification_type="moderation_warning",
        title=f"Cảnh cáo từ SportGo về {label}",
        body=data.message.strip(),
        target_url=url,
        entity_type=data.target_type,
        entity_id=data.target_id,
    )
    db.commit()
    db.refresh(warning)
    return warning
