import os
import uuid
import boto3
from botocore.client import Config
from dotenv import load_dotenv

load_dotenv()

# Lấy cấu hình từ .env theo dạng HMAC S3
STORAGE_ENDPOINT = os.getenv("STORAGE_ENDPOINT", "https://storage.googleapis.com")
STORAGE_ACCESS_KEY_ID = os.getenv("STORAGE_ACCESS_KEY_ID")
STORAGE_SECRET_ACCESS_KEY = os.getenv("STORAGE_SECRET_ACCESS_KEY")
STORAGE_BUCKET_NAME = os.getenv("STORAGE_BUCKET_NAME")

def get_s3_client():
    if not STORAGE_ACCESS_KEY_ID or not STORAGE_SECRET_ACCESS_KEY:
        raise ValueError("Thiếu cấu hình STORAGE_ACCESS_KEY_ID hoặc STORAGE_SECRET_ACCESS_KEY trong .env")
        
    client = boto3.client(
        's3',
        endpoint_url=STORAGE_ENDPOINT,
        aws_access_key_id=STORAGE_ACCESS_KEY_ID,
        aws_secret_access_key=STORAGE_SECRET_ACCESS_KEY,
        config=Config(
            signature_version='s3v4',
            request_checksum_calculation='when_required',
            response_checksum_validation='when_required'
        )
    )
    return client

def upload_image_to_gcp(file_bytes: bytes, original_filename: str, content_type: str = "image/jpeg") -> str:
    """
    Uploads an image to GCP Storage (via S3 API) and returns the public URL.
    """
    try:
        client = get_s3_client()
        
        # Generate a unique filename to prevent overwriting
        ext = original_filename.split(".")[-1] if "." in original_filename else "jpg"
        unique_filename = f"posts/{uuid.uuid4().hex}.{ext}"
        
        client.put_object(
            Bucket=STORAGE_BUCKET_NAME,
            Key=unique_filename,
            Body=file_bytes,
            ContentType=content_type
        )
        
        # We'll return the proxy URL directly so frontend doesn't need to append base url
        public_url = f"http://127.0.0.1:8000/api/posts/images/{unique_filename}"
        return public_url
    except Exception as e:
        print(f"Lỗi upload ảnh lên GCP: {e}")
        raise e
