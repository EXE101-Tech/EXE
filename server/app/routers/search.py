from urllib.parse import quote_plus

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app import auth_utils, database, models, schemas

router = APIRouter(prefix="/search", tags=["Search"])


def _contains(column, term: str):
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return column.ilike(f"%{escaped}%", escape="\\")


@router.get("", response_model=list[schemas.SearchResult])
def search_everything(
    q: str = Query(..., min_length=2, max_length=80),
    limit: int = Query(6, ge=1, le=10),
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    term = q.strip()
    if len(term) < 2:
        return []

    pattern = [
        _contains(models.Venue.name, term),
        _contains(models.Venue.address, term),
        _contains(models.Venue.description, term),
    ]
    venues = db.query(models.Venue).filter(
        models.Venue.is_active.is_(True), or_(*pattern)
    ).order_by(models.Venue.name.asc()).limit(limit).all()

    matches = db.query(models.Match).filter(
        func.upper(func.coalesce(models.Match.status, "OPEN")) == "OPEN",
        or_(
            _contains(models.Match.title, term),
            _contains(models.Match.location, term),
            _contains(models.Match.description, term),
        ),
    ).order_by(models.Match.created_at.desc()).limit(limit).all()

    teams = db.query(models.Team).filter(
        or_(
            _contains(models.Team.name, term),
            _contains(models.Team.location, term),
            _contains(models.Team.description, term),
        ),
    ).order_by(models.Team.name.asc()).limit(limit).all()

    social_posts = db.query(models.SocialPost).options(
        joinedload(models.SocialPost.author).joinedload(models.User.profile),
    ).join(models.SocialPost.author).outerjoin(
        models.UserProfile, models.UserProfile.user_id == models.User.id,
    ).filter(or_(
        _contains(models.SocialPost.content, term),
        _contains(models.UserProfile.full_name, term),
    )).order_by(models.SocialPost.created_at.desc()).limit(limit).all()

    encoded_term = quote_plus(term)
    result_groups = [[
        schemas.SearchResult(
            kind="venue", id=venue.id, title=venue.name, subtitle=venue.address,
            href=f"/courts/{venue.id}",
        )
        for venue in venues
    ], [
        schemas.SearchResult(
            kind="gameroom", id=match.id, title=match.title,
            subtitle=match.location or "Phòng chơi",
            href=f"/matches?search={quote_plus(match.title)}",
        )
        for match in matches
    ], [
        schemas.SearchResult(
            kind="team", id=team.id, title=team.name,
            subtitle=team.location or team.sport_name or "CLB",
            href=f"/team?search={quote_plus(team.name)}",
        )
        for team in teams
    ], [
        schemas.SearchResult(
            kind="social_post", id=post.id,
            title=f"Bài viết của {post.author.profile.full_name if post.author and post.author.profile and post.author.profile.full_name else 'người chơi'}",
            subtitle=(post.content or "Ảnh/video")[:100],
            href=f"/tournaments?search={encoded_term}",
        )
        for post in social_posts
    ]]
    results = []
    for index in range(limit):
        for group in result_groups:
            if index < len(group):
                results.append(group[index])
                if len(results) == limit:
                    return results
    return results
