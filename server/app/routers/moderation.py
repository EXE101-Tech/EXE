from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app import auth_utils, database, models, schemas

router = APIRouter(prefix="/moderation", tags=["Safety and moderation"])


def _ensure_admin(current_user: models.User) -> None:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Bạn không có quyền kiểm duyệt")


def _target_exists(db: Session, target_type: str, target_id: int) -> bool:
    model_by_type = {
        "post": models.SocialPost,
        "comment": models.SocialPostComment,
        "user": models.User,
        "message": models.Message,
    }
    model = model_by_type[target_type]
    return db.query(model.id).filter(model.id == target_id).first() is not None


@router.post("/reports", response_model=schemas.ContentReportResponse, status_code=status.HTTP_201_CREATED)
def report_content(
    data: schemas.ContentReportCreate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    if current_user.is_admin:
        raise HTTPException(status_code=403, detail="Tài khoản quản trị không gửi báo cáo")
    if data.target_type == "user" and data.target_id == current_user.id:
        raise HTTPException(status_code=400, detail="Bạn không thể báo cáo chính mình")
    if not _target_exists(db, data.target_type, data.target_id):
        raise HTTPException(status_code=404, detail="Không tìm thấy nội dung cần báo cáo")
    duplicate = db.query(models.ContentReport).filter(
        models.ContentReport.reporter_id == current_user.id,
        models.ContentReport.target_type == data.target_type,
        models.ContentReport.target_id == data.target_id,
        models.ContentReport.status == "PENDING",
    ).first()
    if duplicate:
        return duplicate
    report = models.ContentReport(
        reporter_id=current_user.id,
        target_type=data.target_type,
        target_id=data.target_id,
        reason=data.reason.strip(),
        details=data.details.strip() if data.details else None,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.post("/blocks/{user_id}", status_code=status.HTTP_201_CREATED)
def block_user(
    user_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Bạn không thể chặn chính mình")
    target = db.query(models.User).filter_by(id=user_id, status="active").first()
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    existing = db.query(models.UserBlock).filter_by(blocker_id=current_user.id, blocked_id=user_id).first()
    if not existing:
        db.add(models.UserBlock(blocker_id=current_user.id, blocked_id=user_id))
        db.commit()
    return {"blocked": True, "user_id": user_id}


@router.delete("/blocks/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def unblock_user(
    user_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    db.query(models.UserBlock).filter_by(blocker_id=current_user.id, blocked_id=user_id).delete(synchronize_session=False)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/blocks")
def list_blocked_users(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    return [item.blocked_id for item in db.query(models.UserBlock).filter_by(blocker_id=current_user.id).all()]


@router.get("/admin/reports", response_model=list[schemas.ContentReportResponse])
def list_reports(
    report_status: str = Query("PENDING", alias="status", pattern="^(PENDING|RESOLVED|DISMISSED)$"),
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _ensure_admin(current_user)
    return db.query(models.ContentReport).filter_by(status=report_status).order_by(
        models.ContentReport.created_at.desc(), models.ContentReport.id.desc(),
    ).limit(200).all()


@router.patch("/admin/reports/{report_id}", response_model=schemas.ContentReportResponse)
def review_report(
    report_id: int,
    data: schemas.ContentReportReview,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _ensure_admin(current_user)
    report = db.query(models.ContentReport).filter_by(id=report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo")
    report.status = data.status
    report.action = data.action
    report.reviewed_by = current_user.id
    report.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(report)
    return report


@router.get("/admin/account-deletion-requests")
def list_account_deletion_requests(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _ensure_admin(current_user)
    return db.query(models.AccountDeletionRequest).filter_by(status="PENDING").order_by(
        models.AccountDeletionRequest.created_at.asc(),
    ).limit(200).all()


@router.post("/admin/account-deletion-requests/{request_id}/complete")
def complete_account_deletion_request(
    request_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    _ensure_admin(current_user)
    request = db.query(models.AccountDeletionRequest).filter_by(id=request_id, status="PENDING").first()
    if not request:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu xoá tài khoản")
    target = db.query(models.User).filter_by(id=request.user_id).first() if request.user_id else None
    if target and not target.is_admin:
        from app.routers.auth import _delete_user_data
        _delete_user_data(db, target.id)
    else:
        request.status = "COMPLETED"
        request.processed_at = datetime.now(timezone.utc).replace(tzinfo=None)
        request.processed_by = current_user.id
    db.commit()
    return {"completed": True}
