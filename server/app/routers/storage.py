import os
import re
import uuid
import logging
from functools import lru_cache
from io import BytesIO

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from starlette.background import BackgroundTask

from app import auth_utils, models

router = APIRouter(prefix="/storage", tags=["Image storage"])
logger = logging.getLogger(__name__)
MAX_IMAGE_BYTES = 8 * 1024 * 1024
MEDIA_KEY_PATTERN = re.compile(r"^sportgo/[0-9]+/[a-f0-9]{32}\.(jpg|png|webp|avif)$")


@lru_cache(maxsize=1)
def _storage_config():
    endpoint = os.getenv("STORAGE_ENDPOINT")
    access_key = os.getenv("STORAGE_ACCESS_KEY_ID")
    secret_key = os.getenv("STORAGE_SECRET_ACCESS_KEY")
    bucket = os.getenv("STORAGE_BUCKET_NAME")
    if not all((endpoint, access_key, secret_key, bucket)):
        raise HTTPException(status_code=503, detail="Dịch vụ lưu trữ ảnh chưa được cấu hình đầy đủ")
    client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=os.getenv("STORAGE_REGION", "auto"),
        # GCS XML API cannot combine AWS V4 signatures with aws-chunked uploads.
        # Botocore 1.36+ adds optional streaming checksums by default; only send
        # a checksum when the operation explicitly requires one.
        config=Config(request_checksum_calculation="when_required"),
    )
    return client, bucket


def _detect_image(data: bytes):
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg", "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png", "image/png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp", "image/webp"
    if len(data) >= 12 and data[4:8] == b"ftyp" and data[8:12] in (b"avif", b"avis"):
        return "avif", "image/avif"
    return None, None


@router.post("/images")
async def upload_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    content = await file.read(MAX_IMAGE_BYTES + 1)
    await file.close()
    if not content or len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Ảnh phải có dung lượng tối đa 8 MB")
    extension, content_type = _detect_image(content)
    if not extension:
        raise HTTPException(status_code=415, detail="Chỉ hỗ trợ ảnh JPEG, PNG, WebP hoặc AVIF")

    client, bucket = _storage_config()
    key = f"sportgo/{current_user.id}/{uuid.uuid4().hex}.{extension}"
    try:
        client.put_object(
            Bucket=bucket,
            Key=key,
            Body=BytesIO(content),
            ContentLength=len(content),
            ContentType=content_type,
            CacheControl="public, max-age=31536000, immutable",
        )
    except ClientError as error:
        response = error.response
        code = response.get("Error", {}).get("Code", "Unknown")
        status = response.get("ResponseMetadata", {}).get("HTTPStatusCode", "unknown")
        request_id = response.get("ResponseMetadata", {}).get("RequestId", "unknown")
        logger.warning(
            "Object storage rejected image upload (code=%s status=%s request_id=%s)",
            code,
            status,
            request_id,
        )
        if code == "UserProjectAccountProblem":
            raise HTTPException(
                status_code=503,
                detail="Dịch vụ lưu trữ chưa thể ghi ảnh do billing của Google Cloud project đang bị đóng",
            )
        if code in {"AccessDenied", "Unauthorized", "AllAccessDisabled"}:
            raise HTTPException(status_code=503, detail="Tài khoản lưu trữ chưa được cấp quyền tải ảnh lên")
        if code == "InvalidAccessKeyId":
            raise HTTPException(status_code=503, detail="Thông tin xác thực dịch vụ lưu trữ không hợp lệ")
        if code == "SignatureDoesNotMatch":
            raise HTTPException(status_code=503, detail="Chữ ký yêu cầu tải ảnh không hợp lệ với dịch vụ lưu trữ")
        if code in {"NoSuchBucket", "InvalidBucketName", "PermanentRedirect"}:
            raise HTTPException(status_code=503, detail="Bucket lưu trữ chưa tồn tại hoặc cấu hình chưa chính xác")
        raise HTTPException(status_code=502, detail="Không thể lưu ảnh lên dịch vụ lưu trữ")
    except BotoCoreError as error:
        logger.warning("Object storage transport error during image upload (type=%s)", type(error).__name__)
        raise HTTPException(status_code=502, detail="Không thể lưu ảnh lên dịch vụ lưu trữ")
    return {"url": f"/api/storage/media/{key}"}


@router.get("/media/{key:path}")
def get_image(key: str):
    if not MEDIA_KEY_PATTERN.fullmatch(key):
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh")
    client, bucket = _storage_config()
    try:
        result = client.get_object(Bucket=bucket, Key=key)
    except ClientError as error:
        code = error.response.get("Error", {}).get("Code")
        if code in {"NoSuchKey", "404", "NotFound"}:
            raise HTTPException(status_code=404, detail="Không tìm thấy ảnh")
        raise HTTPException(status_code=502, detail="Không thể tải ảnh")
    except BotoCoreError:
        raise HTTPException(status_code=502, detail="Không thể tải ảnh")

    body = result["Body"]
    return StreamingResponse(
        body.iter_chunks(chunk_size=64 * 1024),
        media_type=result.get("ContentType", "application/octet-stream"),
        headers={
            "Cache-Control": result.get("CacheControl", "public, max-age=86400"),
            "X-Content-Type-Options": "nosniff",
        },
        background=BackgroundTask(body.close),
    )
