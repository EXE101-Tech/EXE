from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import models

SPORTS = {
    "badminton": {"name": "Cầu lông", "database_names": ("Badminton", "Cầu lông")},
    "football": {"name": "Bóng đá", "database_names": ("Football", "Bóng đá")},
    "pickleball": {"name": "Pickleball", "database_names": ("Pickleball",)},
    "tennis": {"name": "Tennis", "database_names": ("Tennis",)},
    "basketball": {"name": "Bóng rổ", "database_names": ("Basketball", "Bóng rổ")},
    "volleyball": {"name": "Bóng chuyền", "database_names": ("Volleyball", "Bóng chuyền")},
}

SPORT_KEY_BY_NAME = {
    name.casefold(): key
    for key, data in SPORTS.items()
    for name in data["database_names"] + (data["name"],)
}


def resolve_sport(db: Session, sport_key: str) -> models.Sport:
    definition = SPORTS.get((sport_key or "").strip().casefold())
    if not definition:
        raise HTTPException(status_code=422, detail="Môn thể thao không được hỗ trợ")
    existing = {
        sport.name.casefold(): sport
        for sport in db.query(models.Sport).filter(models.Sport.name.in_(definition["database_names"])).all()
    }
    for name in definition["database_names"]:
        if name.casefold() in existing:
            return existing[name.casefold()]
    sport = models.Sport(name=definition["database_names"][0])
    db.add(sport)
    db.flush()
    return sport


def sport_key_for(name: str) -> str:
    return SPORT_KEY_BY_NAME.get((name or "").strip().casefold(), "")


def sport_catalog(db: Session):
    all_sports = {sport.name.casefold(): sport for sport in db.query(models.Sport).all()}
    result = []
    for key, definition in SPORTS.items():
        existing = next(
            (all_sports[name.casefold()] for name in definition["database_names"] if name.casefold() in all_sports),
            None,
        )
        result.append({"id": existing.id if existing else None, "key": key, "name": definition["name"]})
    return result
