from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app import auth_utils, database, models, schemas
from app.sport_catalog import SPORTS, resolve_sport, sport_key_for

router = APIRouter(prefix="/teams", tags=["Teams & Clubs"])


def _team_payload(db: Session, team: models.Team, user_id: Optional[int] = None):
    approved_count = db.query(models.TeamMembership).filter(
        models.TeamMembership.team_id == team.id,
        models.TeamMembership.status == "APPROVED",
    ).count()
    rating, rating_count = db.query(
        func.avg(models.TeamReview.rating), func.count(models.TeamReview.id)
    ).filter(models.TeamReview.team_id == team.id).one()
    membership = None
    if user_id is not None:
        membership = db.query(models.TeamMembership).filter(
            models.TeamMembership.team_id == team.id,
            models.TeamMembership.user_id == user_id,
        ).first()
    owner_name = team.owner.profile.full_name if team.owner and team.owner.profile else None
    sport = db.query(models.Sport).filter(models.Sport.id == team.sport_id).first()
    sport_key = team.sport_key or sport_key_for(sport.name if sport else "")
    review_average = round(float(rating), 1) if rating_count else round(float(team.rating or 0), 1)
    return {
        "id": team.id,
        "owner_id": team.owner_id,
        "owner_name": owner_name or (team.owner.email if team.owner else "Trưởng CLB chưa cập nhật"),
        "name": team.name,
        "sport_id": sport_key,
        "sport_name": team.sport_name or (sport.name if sport else "Môn thể thao"),
        "description": team.description,
        "location": team.location or "Chưa cập nhật",
        "total_slots": team.total_slots,
        "member_count": max(approved_count, 1),
        "rating": review_average,
        "rating_count": int(rating_count or team.rating_count or 0),
        "image_url": team.image_url,
        "tags": team.tags or [],
        "membership_status": membership.status if membership else None,
        "is_captain": team.owner_id == user_id if user_id is not None else False,
        "is_member": bool(membership and membership.status == "APPROVED"),
        "created_at": team.created_at,
    }


def _get_team_or_404(db: Session, team_id: int):
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Không tìm thấy CLB")
    return team


@router.get("", response_model=List[schemas.TeamResponse])
def list_teams(
    scope: str = Query("all", pattern="^(all|owned|joined)$"),
    sport_id: Optional[str] = None,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    query = db.query(models.Team)
    if sport_id:
        definition = SPORTS.get(sport_id.strip().casefold())
        if not definition:
            raise HTTPException(status_code=422, detail="Môn thể thao không được hỗ trợ")
        sport_ids = [row[0] for row in db.query(models.Sport.id).filter(
            models.Sport.name.in_(definition["database_names"])
        ).all()]
        filters = [models.Team.sport_key == sport_id.strip().casefold()]
        if sport_ids:
            filters.append(models.Team.sport_id.in_(sport_ids))
        query = query.filter(or_(*filters))
    if scope == "owned":
        query = query.filter(models.Team.owner_id == current_user.id)
    elif scope == "joined":
        query = query.join(models.TeamMembership).filter(
            models.TeamMembership.user_id == current_user.id,
            models.TeamMembership.status == "APPROVED",
        )
    teams = query.order_by(models.Team.created_at.desc()).all()
    return [_team_payload(db, team, current_user.id) for team in teams]


@router.post("", response_model=schemas.TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(
    data: schemas.TeamCreate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    sport_key = data.sport_id.strip().casefold()
    sport = resolve_sport(db, sport_key)
    team = models.Team(
        owner_id=current_user.id,
        name=data.name,
        sport_id=sport.id,
        sport_key=sport_key,
        sport_name=SPORTS[sport_key]["name"],
        description=data.description,
        location=data.location,
        total_slots=data.total_slots,
        image_url=data.image_url,
        tags=data.tags,
    )
    db.add(team)
    db.flush()
    db.add(models.TeamMembership(team_id=team.id, user_id=current_user.id, status="APPROVED"))
    db.commit()
    db.refresh(team)
    return _team_payload(db, team, current_user.id)


@router.get("/{team_id}", response_model=schemas.TeamResponse)
def get_team(
    team_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    return _team_payload(db, _get_team_or_404(db, team_id), current_user.id)


@router.patch("/{team_id}", response_model=schemas.TeamResponse)
def update_team(
    team_id: int,
    data: schemas.TeamUpdate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    team = _get_team_or_404(db, team_id)
    if team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Chỉ trưởng CLB mới được chỉnh sửa")
    changes = data.model_dump(exclude_unset=True)
    sport_key = changes.pop("sport_id", None)
    changes.pop("sport_name", None)
    if "total_slots" in changes:
        approved = db.query(models.TeamMembership).filter(
            models.TeamMembership.team_id == team.id,
            models.TeamMembership.status == "APPROVED",
        ).count()
        if changes["total_slots"] < approved:
            raise HTTPException(status_code=409, detail="Số chỗ không thể ít hơn số thành viên hiện tại")
    for key, value in changes.items():
        setattr(team, key, value)
    if sport_key is not None:
        sport_key = sport_key.strip().casefold()
        sport = resolve_sport(db, sport_key)
        team.sport_id = sport.id
        team.sport_key = sport_key
        team.sport_name = SPORTS[sport_key]["name"]
    db.commit()
    db.refresh(team)
    return _team_payload(db, team, current_user.id)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(
    team_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    team = _get_team_or_404(db, team_id)
    if team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Chỉ trưởng CLB mới được xóa CLB")
    db.delete(team)
    db.commit()


@router.post("/{team_id}/join", response_model=schemas.TeamMemberResponse, status_code=status.HTTP_201_CREATED)
def request_to_join_team(
    team_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    team = _get_team_or_404(db, team_id)
    if team.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="Bạn đang là trưởng CLB này")
    existing = db.query(models.TeamMembership).filter_by(team_id=team.id, user_id=current_user.id).first()
    if existing and existing.status == "APPROVED":
        raise HTTPException(status_code=409, detail="Bạn đã là thành viên CLB")
    if existing and existing.status == "PENDING":
        raise HTTPException(status_code=409, detail="Yêu cầu tham gia đang chờ duyệt")
    approved = db.query(models.TeamMembership).filter_by(team_id=team.id, status="APPROVED").count()
    if approved >= team.total_slots:
        raise HTTPException(status_code=409, detail="CLB đã đủ thành viên")
    if existing:
        existing.status = "PENDING"
        membership = existing
    else:
        membership = models.TeamMembership(team_id=team.id, user_id=current_user.id, status="PENDING")
        db.add(membership)
    db.commit()
    db.refresh(membership)
    return _member_payload(membership)


@router.delete("/{team_id}/membership", status_code=status.HTTP_204_NO_CONTENT)
def leave_team(
    team_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    team = _get_team_or_404(db, team_id)
    if team.owner_id == current_user.id:
        raise HTTPException(status_code=409, detail="Trưởng CLB cần xóa CLB hoặc chuyển quyền trước")
    membership = db.query(models.TeamMembership).filter_by(team_id=team.id, user_id=current_user.id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Bạn chưa tham gia CLB")
    db.delete(membership)
    db.commit()


def _member_payload(membership: models.TeamMembership):
    user = membership.user
    full_name = user.profile.full_name if user.profile else None
    return {
        "id": membership.id,
        "team_id": membership.team_id,
        "user_id": membership.user_id,
        "full_name": full_name,
        "email": None,
        "status": membership.status,
        "joined_at": membership.joined_at,
    }


@router.get("/{team_id}/members", response_model=List[schemas.TeamMemberResponse])
def list_team_members(
    team_id: int,
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(PENDING|APPROVED|REJECTED)$"),
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    team = _get_team_or_404(db, team_id)
    own_membership = db.query(models.TeamMembership).filter_by(team_id=team.id, user_id=current_user.id).first()
    if team.owner_id != current_user.id and not (own_membership and own_membership.status == "APPROVED"):
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem danh sách thành viên")
    query = db.query(models.TeamMembership).filter(models.TeamMembership.team_id == team.id)
    if status_filter:
        if team.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Chỉ trưởng CLB được xem yêu cầu đang chờ")
        query = query.filter(models.TeamMembership.status == status_filter)
    return [_member_payload(item) for item in query.order_by(models.TeamMembership.joined_at.asc()).all()]


@router.patch("/{team_id}/members/{user_id}", response_model=schemas.TeamMemberResponse)
def set_member_status(
    team_id: int,
    user_id: int,
    data: schemas.TeamMembershipStatusUpdate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    team = _get_team_or_404(db, team_id)
    if team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Chỉ trưởng CLB mới được duyệt thành viên")
    member = db.query(models.TeamMembership).filter_by(team_id=team.id, user_id=user_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu thành viên")
    if data.status == "APPROVED" and member.status != "APPROVED":
        approved = db.query(models.TeamMembership).filter_by(team_id=team.id, status="APPROVED").count()
        if approved >= team.total_slots:
            raise HTTPException(status_code=409, detail="CLB đã đủ thành viên")
    member.status = data.status
    db.commit()
    db.refresh(member)
    return _member_payload(member)


@router.get("/{team_id}/reviews", response_model=List[schemas.TeamReviewResponse])
def list_team_reviews(team_id: int, db: Session = Depends(database.get_db)):
    _get_team_or_404(db, team_id)
    return db.query(models.TeamReview).filter_by(team_id=team_id).order_by(models.TeamReview.created_at.desc()).all()


@router.post("/{team_id}/reviews", response_model=schemas.TeamReviewResponse)
def submit_team_review(
    team_id: int,
    data: schemas.TeamReviewCreate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    team = _get_team_or_404(db, team_id)
    if team.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="Không thể tự đánh giá CLB của mình")
    review = db.query(models.TeamReview).filter_by(team_id=team.id, user_id=current_user.id).first()
    if review:
        for key, value in data.model_dump().items():
            setattr(review, key, value)
    else:
        review = models.TeamReview(team_id=team.id, user_id=current_user.id, **data.model_dump())
        db.add(review)
    db.commit()
    db.refresh(review)
    return review
