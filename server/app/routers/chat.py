from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Dict
from app import database, schemas, crud, auth_utils, models
import json

router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)

# In-memory store for active websocket connections
# Mapping: user_id -> WebSocket
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: str, user_id: int):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(message)

manager = ConnectionManager()

@router.get("/conversations", response_model=List[schemas.ConversationResponse])
def get_conversations(
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Get all conversations for the current user.
    """
    return crud.get_conversations(db, user_id=current_user.id)

@router.get("/conversations/{user2_id}", response_model=schemas.ConversationResponse)
def get_or_create_conversation(
    user2_id: int,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Get or create a conversation with a specific user.
    """
    if current_user.id == user2_id:
        raise HTTPException(status_code=400, detail="Cannot chat with yourself")
    
    # Check if user2 exists
    user2 = db.query(models.User).filter(models.User.id == user2_id).first()
    if not user2:
        raise HTTPException(status_code=404, detail="User not found")
        
    return crud.get_or_create_conversation(db, current_user.id, user2_id)


@router.get("/messages/{conversation_id}", response_model=List[schemas.MessageResponse])
def get_messages(
    conversation_id: int,
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Get messages for a conversation.
    """
    conv = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    if conv.user1_id != current_user.id and conv.user2_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this conversation")
        
    return crud.get_messages(db, conversation_id=conversation_id)

@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str, db: Session = Depends(database.get_db)):
    # Very basic token auth for websocket
    user = None
    try:
        from jose import jwt
        from app.auth_utils import SECRET_KEY, ALGORITHM
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email:
            user = db.query(models.User).filter(models.User.email == email).first()
    except Exception:
        pass
        
    if not user:
        await websocket.close(code=1008)
        return
        
    await manager.connect(websocket, user.id)
    try:
        while True:
            data = await websocket.receive_text()
            # Expecting data as JSON: {"receiver_id": 1, "text": "Hello"}
            try:
                msg_data = json.loads(data)
                receiver_id = msg_data.get("receiver_id")
                text = msg_data.get("text")
                
                if receiver_id and text:
                    # Get or create conversation
                    conv = crud.get_or_create_conversation(db, user.id, receiver_id)
                    # Save message to DB
                    new_msg = crud.create_message(db, conv.id, user.id, text)
                    
                    # Prepare message payload
                    # In a real app we'd serialize this better (e.g. using Pydantic model dump)
                    payload = {
                        "id": new_msg.id,
                        "conversation_id": conv.id,
                        "sender_id": user.id,
                        "receiver_id": receiver_id,
                        "text": text,
                        "created_at": new_msg.created_at.isoformat(),
                    }
                    
                    # Send to receiver if online
                    await manager.send_personal_message(json.dumps(payload), receiver_id)
                    # Send echo back to sender
                    await manager.send_personal_message(json.dumps(payload), user.id)
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(user.id)
