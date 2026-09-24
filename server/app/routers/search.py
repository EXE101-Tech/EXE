from urllib.parse import quote_plus

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

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

    posts = db.query(models.LfgPost).filter(
        func.upper(func.coalesce(models.LfgPost.status, "OPEN")) != "CANCELLED",
        or_(
            _contains(models.LfgPost.title, term),
            _contains(models.LfgPost.location, term),
            _contains(models.LfgPost.description, term),
        ),
    ).order_by(models.LfgPost.created_at.desc()).limit(limit).all()

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
            kind="lfg", id=post.id, title=post.title,
            subtitle=post.location,
            href=f"/tournaments?search={quote_plus(post.title)}",
        )
        for post in posts
    ]]
    results = []
    for index in range(limit):
        for group in result_groups:
            if index < len(group):
                results.append(group[index])
                if len(results) == limit:
                    return results
    return results
