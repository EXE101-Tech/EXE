"""
Geocoding utility - Tự động chuyển đổi địa chỉ thành tọa độ (lat, lng).
Sử dụng Google Maps Geocoding API (nếu có key) hoặc Nominatim (miễn phí).
Chỉ dùng thư viện chuẩn (urllib) để không cần cài thêm package.
"""
import os
import json
import re
import logging
from urllib.request import Request, urlopen
from urllib.parse import urlencode, quote
from urllib.error import URLError

logger = logging.getLogger(__name__)

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")


def geocode_address(address: str) -> tuple | None:
    """
    Chuyển đổi địa chỉ thành tọa độ (latitude, longitude).
    
    Chiến lược:
    1. Thử Google Maps Geocoding API (chính xác nhất, cần API key)
    2. Fallback: Nominatim OpenStreetMap (miễn phí, ít chính xác hơn)
    3. Fallback 2: Thử rút gọn địa chỉ (bỏ số nhà)
    
    Returns:
        Tuple (latitude, longitude) hoặc None nếu không tìm được.
    """
    # Strategy 1: Google Maps Geocoding API
    if GOOGLE_MAPS_API_KEY:
        result = _geocode_google(address)
        if result:
            return result
    
    # Strategy 2: Nominatim (miễn phí, fallback)
    result = _geocode_nominatim(address)
    if result:
        return result
    
    # Strategy 3: Thử rút gọn địa chỉ
    result = _geocode_nominatim_simplified(address)
    if result:
        return result
    
    return None


def _fetch_json(url: str, headers: dict = None) -> dict | list | None:
    """Helper: fetch JSON from URL using stdlib."""
    try:
        req = Request(url)
        if headers:
            for k, v in headers.items():
                req.add_header(k, v)
        with urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except (URLError, json.JSONDecodeError, Exception) as e:
        logger.error(f"Fetch error: {e}")
        return None


def _geocode_google(address: str) -> tuple | None:
    """Geocode bằng Google Maps API (chính xác nhất)."""
    params = urlencode({
        "address": address + ", Ho Chi Minh, Vietnam",
        "key": GOOGLE_MAPS_API_KEY,
        "language": "vi",
        "region": "vn"
    })
    url = f"https://maps.googleapis.com/maps/api/geocode/json?{params}"
    
    data = _fetch_json(url)
    if data and data.get("status") == "OK" and data.get("results"):
        location = data["results"][0]["geometry"]["location"]
        lat, lng = location["lat"], location["lng"]
        logger.info(f"Google geocode OK: {address} -> {lat}, {lng}")
        return (lat, lng)
    
    logger.warning(f"Google geocode FAILED for: {address}")
    return None


def _geocode_nominatim(address: str) -> tuple | None:
    """Geocode bằng Nominatim OpenStreetMap (miễn phí)."""
    # Cắt bỏ phần "Quận X" trở về sau theo gợi ý
    parts = address.split(',')
    clean_parts = []
    for p in parts:
        stripped = p.strip()
        if any(kw in stripped for kw in ['Quận', 'Thủ Đức', 'Ho Chi Minh', 'TP.']):
            break
        clean_parts.append(stripped)
    
    query = ', '.join(clean_parts) + ', Ho Chi Minh, Vietnam'
    params = urlencode({"q": query, "format": "json", "limit": "1"})
    url = f"https://nominatim.openstreetmap.org/search?{params}"
    headers = {"User-Agent": "EXE101_SportApp (student_project)"}
    
    data = _fetch_json(url, headers)
    if data and len(data) > 0:
        lat, lng = float(data[0]["lat"]), float(data[0]["lon"])
        logger.info(f"Nominatim geocode OK: {query} -> {lat}, {lng}")
        return (lat, lng)
    
    return None


def _geocode_nominatim_simplified(address: str) -> tuple | None:
    """Thử geocode chỉ với tên đường + phường (bỏ số nhà)."""
    parts = address.split(',')
    clean_parts = []
    for p in parts:
        stripped = p.strip()
        if any(kw in stripped for kw in ['Quận', 'Thủ Đức', 'Ho Chi Minh', 'TP.']):
            break
        clean_parts.append(stripped)
    
    if not clean_parts:
        return None
    
    # Bỏ số nhà ở đầu
    street = clean_parts[0]
    street_no_num = re.sub(
        r'^(Số\s+\d+[a-zA-Z]*|\d+[a-zA-Z]*/?\d*|Đối diện hẻm\s+\d+/\d+|Hẻm\s+\d+)\s*',
        '', street
    ).strip()
    
    ward = clean_parts[1] if len(clean_parts) > 1 else ""
    query = f"{street_no_num}, {ward}, Ho Chi Minh, Vietnam"
    params = urlencode({"q": query, "format": "json", "limit": "1"})
    url = f"https://nominatim.openstreetmap.org/search?{params}"
    headers = {"User-Agent": "EXE101_SportApp (student_project)"}
    
    data = _fetch_json(url, headers)
    if data and len(data) > 0:
        lat, lng = float(data[0]["lat"]), float(data[0]["lon"])
        logger.info(f"Nominatim simplified OK: {query} -> {lat}, {lng}")
        return (lat, lng)
    
    return None
