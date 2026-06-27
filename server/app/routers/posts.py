from fastapi import APIRouter, Depends, Query, File, UploadFile, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from fastapi.responses import StreamingResponse
import io
from app import database, schemas, crud, auth_utils
from app.services.gcp_storage import upload_image_to_gcp, get_s3_client, STORAGE_BUCKET_NAME

router = APIRouter(
    prefix="/posts",
    tags=["Posts"]
)

@router.get("", response_model=List[schemas.PostResponse])
def get_posts(
    user_id: Optional[int] = Query(None),
    sport_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(database.get_db)
):
    """
    Get a list of all posts (feed).
    """
    return crud.get_posts(db, sport_id=sport_id, user_id=user_id, skip=skip, limit=limit)

@router.get("/images/{blob_name:path}")
def get_image(blob_name: str):
    """
    Proxy image from GCP Storage since the bucket is private (via S3 API).
    """
    client = get_s3_client()
    try:
        response = client.get_object(Bucket=STORAGE_BUCKET_NAME, Key=blob_name)
        file_bytes = response['Body'].read()
        content_type = response.get('ContentType', 'image/jpeg')
        return StreamingResponse(io.BytesIO(file_bytes), media_type=content_type)
    except Exception as e:
        if hasattr(e, 'response') and e.response.get('Error', {}).get('Code') == 'NoSuchKey':
            raise HTTPException(status_code=404, detail="Image not found")
        raise e

@router.post("", response_model=schemas.PostResponse)
async def create_post(
    team_id: Optional[int] = Form(None),
    sport_id: Optional[int] = Form(None),
    content: str = Form(...),
    location: Optional[str] = Form(None),
    required_level: Optional[str] = Form(None),
    start_time: Optional[datetime] = Form(None),
    required_players: int = Form(1),
    images: List[UploadFile] = File(default=[]),
    current_user = Depends(auth_utils.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Create a new post with optional multiple images.
    """
    post_data = schemas.PostCreate(
        team_id=team_id,
        sport_id=sport_id,
        content=content,
        location=location,
        required_level=required_level,
        start_time=start_time,
        required_players=required_players
    )
    
    # Create the post in DB
    new_post = crud.create_post(db, post_data=post_data, user_id=current_user.id)
    
    # Process images if any
    for image in images:
        if image.filename:
            file_bytes = await image.read()
            # Upload to GCP
            try:
                public_url = upload_image_to_gcp(file_bytes, image.filename, image.content_type)
                crud.create_post_image(db, new_post.id, public_url)
            except Exception as e:
                # We could log the error but still return the post
                print(f"Failed to upload image {image.filename}: {e}")
                
    # Refresh post to get relations (like images) loaded properly
    db.refresh(new_post)
    return new_post
