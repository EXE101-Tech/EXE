from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app import auth_utils, database, models, schemas
from app.notification_utils import create_notification, display_name

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


def _friendship_payload(friendship: models.Friendship, current_user_id: int):
    peer_id = friendship.user_high_id if friendship.user_low_id == current_user_id else friendship.user_low_id
    peer = friendship.user_high if friendship.user_high_id == peer_id else friendship.user_low
    return {
        "id": friendship.id,
        "requester_id": friendship.requester_id,
        "status": friendship.status,
        "user": _user_payload(peer),
        "created_at": friendship.created_at,
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

    if not conversations:
        return []

    convo_ids = [c.id for c in conversations]
    unread_counts = dict(
        db.query(models.Message.conversation_id, func.count(models.Message.id))
        .filter(
            models.Message.conversation_id.in_(convo_ids),
            models.Message.sender_id != current_user.id,
            models.Message.is_read == 0,
        )
        .group_by(models.Message.conversation_id)
        .all()
    )

    result = []
    for item in conversations:
        other = _other_user(item, current_user.id)
        result.append({
            "id": item.id,
            "other_user": _user_payload(other),
            "last_message": item.last_message,
            "updated_at": item.updated_at,
            "unread_count": unread_counts.get(item.id, 0),
        })
    return result


@router.get("/unread-count")
def unread_message_count(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    count = db.query(func.count(models.Message.id)).join(
        models.Conversation, models.Conversation.id == models.Message.conversation_id,
    ).filter(
        or_(models.Conversation.user1_id == current_user.id, models.Conversation.user2_id == current_user.id),
        models.Message.sender_id != current_user.id,
        models.Message.is_read == 0,
    ).scalar() or 0
    return {"unread_count": count}


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
    db.query(models.Notification).filter(
        models.Notification.recipient_id == current_user.id,
        models.Notification.type == "chat_message",
        models.Notification.entity_type == "conversation",
        models.Notification.entity_id == conversation.id,
        models.Notification.is_read.is_(False),
    ).update({models.Notification.is_read: True}, synchronize_session=False)
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
    recipient = _other_user(conversation, current_user.id)
    create_notification(
        db,
        recipient_id=recipient.id,
        actor=current_user,
        notification_type="chat_message",
        title="Bạn có tin nhắn mới",
        body=f'{display_name(current_user)} đã gửi cho bạn một tin nhắn.',
        target_url="/chat",
        entity_type="conversation",
        entity_id=conversation.id,
    )
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


@router.get("/users", response_model=list[schemas.ChatUserSearchResponse])
def search_chat_users(
    q: str = Query("", max_length=100),
    limit: int = Query(20, ge=1, le=50),
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    query = q.strip()
    if len(query) < 2:
        return []
    pattern = f"%{query}%"
    users = db.query(models.User).options(joinedload(models.User.profile)).outerjoin(
        models.UserProfile, models.UserProfile.user_id == models.User.id
    ).filter(
        models.User.id != current_user.id,
        func.coalesce(models.User.status, "active") == "active",
        or_(models.UserProfile.full_name.ilike(pattern), models.User.email.ilike(pattern)),
    ).order_by(models.UserProfile.full_name.asc(), models.User.id.asc()).limit(limit).all()
    if not users:
        return []
    user_ids = [person.id for person in users]
    relationships = db.query(models.Friendship).filter(
        or_(
            (models.Friendship.user_low_id == current_user.id) & models.Friendship.user_high_id.in_(user_ids),
            (models.Friendship.user_high_id == current_user.id) & models.Friendship.user_low_id.in_(user_ids),
        )
    ).all()
    by_peer = {
        (item.user_high_id if item.user_low_id == current_user.id else item.user_low_id): item
        for item in relationships
    }
    results = []
    for person in users:
        relationship = by_peer.get(person.id)
        state = "none"
        if relationship:
            state = "accepted" if relationship.status == "accepted" else (
                "outgoing" if relationship.requester_id == current_user.id else "incoming"
            )
        results.append({
            **_user_payload(person),
            "friendship_status": state,
            "friendship_id": relationship.id if relationship else None,
        })
    return results


@router.get("/friends", response_model=list[schemas.FriendshipResponse])
def list_friends(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    relationships = db.query(models.Friendship).options(
        joinedload(models.Friendship.user_low).joinedload(models.User.profile),
        joinedload(models.Friendship.user_high).joinedload(models.User.profile),
    ).filter(
        models.Friendship.status == "accepted",
        or_(models.Friendship.user_low_id == current_user.id, models.Friendship.user_high_id == current_user.id),
    ).order_by(models.Friendship.updated_at.desc()).all()
    return [_friendship_payload(item, current_user.id) for item in relationships]


@router.get("/friends/requests", response_model=list[schemas.FriendshipResponse])
def list_friend_requests(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    relationships = db.query(models.Friendship).options(
        joinedload(models.Friendship.user_low).joinedload(models.User.profile),
        joinedload(models.Friendship.user_high).joinedload(models.User.profile),
    ).filter(
        models.Friendship.status == "pending",
        models.Friendship.requester_id != current_user.id,
        or_(models.Friendship.user_low_id == current_user.id, models.Friendship.user_high_id == current_user.id),
    ).order_by(models.Friendship.created_at.desc()).all()
    return [_friendship_payload(item, current_user.id) for item in relationships]


@router.post("/friends/requests", response_model=schemas.FriendshipResponse, status_code=status.HTTP_201_CREATED)
def send_friend_request(
    data: schemas.FriendRequestCreate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    recipient_id = data.recipient_id
    if recipient_id == current_user.id:
        raise HTTPException(status_code=400, detail="Bạn không thể kết bạn với chính mình")
    recipient = db.query(models.User).filter_by(id=recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    low_id, high_id = sorted((current_user.id, recipient_id))
    relationship = db.query(models.Friendship).options(
        joinedload(models.Friendship.user_low).joinedload(models.User.profile),
        joinedload(models.Friendship.user_high).joinedload(models.User.profile),
    ).filter_by(user_low_id=low_id, user_high_id=high_id).first()
    if relationship:
        if relationship.status == "accepted":
            raise HTTPException(status_code=409, detail="Hai bạn đã là bạn bè")
        if relationship.requester_id == current_user.id:
            raise HTTPException(status_code=409, detail="Bạn đã gửi lời mời kết bạn")
        raise HTTPException(status_code=409, detail="Người này đã gửi lời mời; hãy chấp nhận trong mục Bạn bè")
    relationship = models.Friendship(
        user_low_id=low_id,
        user_high_id=high_id,
        requester_id=current_user.id,
        status="pending",
    )
    db.add(relationship)
    try:
        db.flush()
        create_notification(
            db,
            recipient_id=recipient_id,
            actor=current_user,
            notification_type="friend_request",
            title="Lời mời kết bạn mới",
            body=f'{display_name(current_user)} đã gửi cho bạn lời mời kết bạn.',
            target_url="/home",
            entity_type="friendship",
            entity_id=relationship.id,
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Lời mời kết bạn đã tồn tại")
    relationship = db.query(models.Friendship).options(
        joinedload(models.Friendship.user_low).joinedload(models.User.profile),
        joinedload(models.Friendship.user_high).joinedload(models.User.profile),
    ).filter_by(id=relationship.id).one()
    return _friendship_payload(relationship, current_user.id)


@router.post("/friends/requests/{friendship_id}/accept", response_model=schemas.FriendshipResponse)
def accept_friend_request(
    friendship_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    relationship = db.query(models.Friendship).options(
        joinedload(models.Friendship.user_low).joinedload(models.User.profile),
        joinedload(models.Friendship.user_high).joinedload(models.User.profile),
    ).filter_by(id=friendship_id).first()
    if not relationship or current_user.id not in (relationship.user_low_id, relationship.user_high_id):
        raise HTTPException(status_code=404, detail="Không tìm thấy lời mời kết bạn")
    if relationship.status != "pending" or relationship.requester_id == current_user.id:
        raise HTTPException(status_code=409, detail="Bạn không thể chấp nhận lời mời này")
    relationship.status = "accepted"
    relationship.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    create_notification(
        db,
        recipient_id=relationship.requester_id,
        actor=current_user,
        notification_type="friend_request_accepted",
        title="Lời mời kết bạn được chấp nhận",
        body=f'{display_name(current_user)} đã chấp nhận lời mời kết bạn của bạn.',
        target_url="/home",
        entity_type="friendship",
        entity_id=relationship.id,
    )
    db.commit()
    return _friendship_payload(relationship, current_user.id)


@router.delete("/friends/{friendship_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_friendship(
    friendship_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db),
):
    relationship = db.query(models.Friendship).filter_by(id=friendship_id).first()
    if not relationship or current_user.id not in (relationship.user_low_id, relationship.user_high_id):
        raise HTTPException(status_code=404, detail="Không tìm thấy mối quan hệ bạn bè")
    other_user_id = relationship.user_high_id if relationship.user_low_id == current_user.id else relationship.user_low_id
    create_notification(
        db,
        recipient_id=other_user_id,
        actor=current_user,
        notification_type="friend_removed",
        title="Mối quan hệ bạn bè đã thay đổi",
        body=f'{display_name(current_user)} đã xóa kết bạn với bạn.',
        target_url="/home",
        entity_type="friendship",
        entity_id=relationship.id,
    )
    db.delete(relationship)
    db.commit()
