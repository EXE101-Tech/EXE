import sys
import os
import time
import requests
import re

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Venue

def fix_coordinates():
    db = SessionLocal()
    venues = db.query(Venue).all()
    headers = {'User-Agent': 'EXE101_App (student_project)'}
    
    print("Starting smart geocoding...")

    for venue in venues:
        parts = venue.address.split(',')
        clean_parts = []
        for p in parts:
            if 'Quận' in p or 'Thủ Đức' in p or 'Ho Chi Minh' in p:
                break
            clean_parts.append(p.strip())
        
        query = ', '.join(clean_parts)
        
        url = 'https://nominatim.openstreetmap.org/search'
        
        # Strategy 1: User's exact suggestion + Ho Chi Minh
        params = {'q': query + ', Ho Chi Minh', 'format': 'json', 'limit': 1}
        try:
            res = requests.get(url, params=params, headers=headers).json()
            if res:
                venue.latitude = float(res[0]["lat"])
                venue.longitude = float(res[0]["lon"])
                db.commit()
                print("FOUND 1")
                time.sleep(1.5)
                continue
            
            # Strategy 2: User's exact suggestion only
            params = {'q': query, 'format': 'json', 'limit': 1}
            res2 = requests.get(url, params=params, headers=headers).json()
            if res2:
                venue.latitude = float(res2[0]["lat"])
                venue.longitude = float(res2[0]["lon"])
                db.commit()
                print("FOUND 2")
                time.sleep(1.5)
                continue
                
            # Strategy 3: Just the street name and ward
            street_only = clean_parts[0]
            street_only_no_num = re.sub(r'^(Số \d+|\d+[a-zA-Z]*|Đối diện hẻm \d+/\d+|\d+/\d+|Hẻm \d+)\s+', '', street_only).strip()
            
            ward = clean_parts[1] if len(clean_parts) > 1 else ""
            params = {'q': f"{street_only_no_num}, {ward}, Ho Chi Minh", 'format': 'json', 'limit': 1}
            res3 = requests.get(url, params=params, headers=headers).json()
            if res3:
                venue.latitude = float(res3[0]["lat"])
                venue.longitude = float(res3[0]["lon"])
                db.commit()
                print("FOUND 3")
                time.sleep(1.5)
                continue
            
            print("FAILED")
        except Exception as e:
            print("ERROR")
        
        time.sleep(1.5)

    print("Coordinates fixed.")
    db.close()

if __name__ == "__main__":
    fix_coordinates()
