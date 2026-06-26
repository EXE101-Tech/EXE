from sqlalchemy.orm import Session
from app import models, schemas
from typing import List, Optional

def get_posts(db: Session, sport_id: Optional[int] = None, user_id: Optional[int] = None, skip: int = 0, limit: int = 50):
    query = db.query(models.Post)
    if sport_id:
        query = query.filter(models.Post.sport_id == sport_id)
    if user_id:
        query = query.filter(models.Post.user_id == user_id)
    return query.order_by(models.Post.created_at.desc()).offset(skip).limit(limit).all()

def create_post(db: Session, post_data: schemas.PostCreate, user_id: int) -> models.Post:
    db_post = models.Post(
        user_id=user_id,
        team_id=post_data.team_id,
        sport_id=post_data.sport_id,
        content=post_data.content,
        location=post_data.location,
        required_level=post_data.required_level,
        start_time=post_data.start_time
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

def create_post_image(db: Session, post_id: int, image_url: str):
    db_image = models.PostImage(post_id=post_id, image_url=image_url)
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image
