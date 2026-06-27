from sqlalchemy.orm import Session
from app import models, schemas
from typing import List, Optional

def get_top_teams(db: Session, sport_id: Optional[int] = None, limit: int = 10):
    query = db.query(models.Team)
    if sport_id:
        query = query.filter(models.Team.sport_id == sport_id)
    return query.order_by(models.Team.rating.desc()).limit(limit).all()


