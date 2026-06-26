from sqlalchemy.orm import Session
from app import models, schemas
from typing import List

def get_conversations(db: Session, user_id: int):
    return db.query(models.Conversation).filter(
        (models.Conversation.user1_id == user_id) | (models.Conversation.user2_id == user_id)
    ).order_by(models.Conversation.updated_at.desc()).all()

def get_messages(db: Session, conversation_id: int):
    return db.query(models.Message).filter(models.Message.conversation_id == conversation_id).order_by(models.Message.created_at.asc()).all()

def create_message(db: Session, conversation_id: int, sender_id: int, text: str):
    db_msg = models.Message(conversation_id=conversation_id, sender_id=sender_id, text=text)
    db.add(db_msg)
    
    # Update conversation's last_message and updated_at
    conv = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if conv:
        conv.last_message = text
        from datetime import datetime, timezone
        conv.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    
    db.commit()
    db.refresh(db_msg)
    return db_msg

def get_or_create_conversation(db: Session, user1_id: int, user2_id: int):
    # Try to find existing conversation
    conv = db.query(models.Conversation).filter(
        ((models.Conversation.user1_id == user1_id) & (models.Conversation.user2_id == user2_id)) |
        ((models.Conversation.user1_id == user2_id) & (models.Conversation.user2_id == user1_id))
    ).first()
    
    if not conv:
        conv = models.Conversation(user1_id=user1_id, user2_id=user2_id)
        db.add(conv)
        db.commit()
        db.refresh(conv)
        
    return conv
