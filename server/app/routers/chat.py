from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app import auth_utils, database, models, schemas

router = APIRouter(prefix="/chat", tags=["Chat"])


def _other_user(conversation: models.Conversation, user_id: int) -> models.User:
    return conversation.user2 if conversation.user1_id == user_id else conversation.user1


def _user_payload(user: models.User):
    profile = user.profile
    return {
        "id": user.id,
        "name": (profile.full_name if profile and profile.full_name else user.email),
        "avatar_url": profile.avatar_url if profile else None,
    }


def _conversation_payload(db: Session, conversation: models.Conversation, user_id: int):
    other = _other_user(conversation, user_id)
    unread_count = db.query(models.Message).filter(
        models.Message.conversation_id == conversation.id,
        models.Message.sender_id != user_id,
        models.Message.is_read == 0,
    ).count()
    return {
        "id": conversation.id,
        "other_user": _user_payload(other),
        "last_message": conversation.last_message,
        "updated_at": conversation.updated_at,
        "unread_count": unread_count,
    }


def _get_conversation(db: Session, conversation_id: int, user_id: int):
    conversation = db.query(models.Conversation).options(
        joinedload(models.Conversation.user1).joinedload(models.User.profile),
        joinedload(models.Conversation.user2).joinedload(models.User.profile),
    ).filter(
        models.Conversation.id == conversation_id,
        or_(models.Conversation.user1_id == user_id, models.Conversation.user2_id == user_id),
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc trò chuyện")
    return conversation


@router.get("/conversations", response_model=list[schemas.ChatConversationResponse])
def list_conversations(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    conversations = db.query(models.Conversation).options(
        joinedload(models.Conversation.user1).joinedload(models.User.profile),
        joinedload(models.Conversation.user2).joinedload(models.User.profile),
    ).filter(
        or_(models.Conversation.user1_id == current_user.id, models.Conversation.user2_id == current_user.id),
    ).order_by(models.Conversation.updated_at.desc()).all()
    return [_conversation_payload(db, item, current_user.id) for item in conversations]


@router.post("/conversations", response_model=schemas.ChatConversationResponse)
def start_conversation(
    data: schemas.ChatConversationCreate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    if data.recipient_id == current_user.id:
        raise HTTPException(status_code=400, detail="Bạn không thể nhắn tin với chính mình")
    recipient = db.query(models.User).options(joinedload(models.User.profile)).filter_by(id=data.recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Không tìm thấy người nhận")

    conversation = db.query(models.Conversation).filter(
        or_(
            (models.Conversation.user1_id == current_user.id) & (models.Conversation.user2_id == recipient.id),
            (models.Conversation.user1_id == recipient.id) & (models.Conversation.user2_id == current_user.id),
        )
    ).first()
    if not conversation:
        first_id, second_id = sorted((current_user.id, recipient.id))
        conversation = models.Conversation(user1_id=first_id, user2_id=second_id)
        db.add(conversation)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            conversation = db.query(models.Conversation).filter(
                or_(
                    (models.Conversation.user1_id == current_user.id) & (models.Conversation.user2_id == recipient.id),
                    (models.Conversation.user1_id == recipient.id) & (models.Conversation.user2_id == current_user.id),
                )
            ).first()
            if not conversation:
                raise
    return _conversation_payload(db, conversation, current_user.id)


@router.get("/conversations/{conversation_id}/messages", response_model=schemas.ChatConversationDetailResponse)
def get_messages(
    conversation_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    conversation = _get_conversation(db, conversation_id, current_user.id)
    db.query(models.Message).filter(
        models.Message.conversation_id == conversation.id,
        models.Message.sender_id != current_user.id,
        models.Message.is_read == 0,
    ).update({models.Message.is_read: 1}, synchronize_session=False)
    db.commit()
    messages = db.query(models.Message).filter_by(conversation_id=conversation.id).order_by(
        models.Message.created_at.asc(), models.Message.id.asc()
    ).all()
    payload = _conversation_payload(db, conversation, current_user.id)
    payload["messages"] = [
        {
            "id": message.id,
            "conversation_id": message.conversation_id,
            "sender_id": message.sender_id,
            "text": message.text,
            "created_at": message.created_at,
            "is_read": bool(message.is_read),
        }
        for message in messages
    ]
    return payload


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=schemas.ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    conversation_id: int,
    data: schemas.ChatMessageCreate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    conversation = _get_conversation(db, conversation_id, current_user.id)
    message = models.Message(
        conversation_id=conversation.id,
        sender_id=current_user.id,
        text=data.text,
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        is_read=0,
    )
    conversation.last_message = data.text
    conversation.updated_at = message.created_at
    db.add(message)
    db.commit()
    db.refresh(message)
    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender_id": message.sender_id,
        "text": message.text,
        "created_at": message.created_at,
        "is_read": bool(message.is_read),
    }
