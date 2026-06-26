import sys
import os
import time
import requests

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Venue

def update_coordinates():
    db = SessionLocal()
    venues = db.query(Venue).all()
    
    headers = {
        'User-Agent': 'EXE101_App (student_project)'
    }
    
    print("Starting geocoding...")
    
    for venue in venues:
        # Avoid redundant calls if they already look somewhat correct or we want to force update
        # We will force update all of them since the random offsets were bad
        query = f"{venue.name}, Quận 9, Ho Chi Minh, Vietnam"
        # Let's try name first, if no result, try address
        
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            'q': query,
            'format': 'json',
            'limit': 1
        }
        
        try:
            res = requests.get(url, params=params, headers=headers)
            data = res.json()
            if data:
                venue.latitude = float(data[0]['lat'])
                venue.longitude = float(data[0]['lon'])
                db.commit()
                print(f"[OK Name] -> {venue.latitude}, {venue.longitude}")
            else:
                # Try address
                addr_query = f"{venue.address}, Ho Chi Minh, Vietnam"
                params['q'] = addr_query
                res = requests.get(url, params=params, headers=headers)
                data = res.json()
                if data:
                    venue.latitude = float(data[0]['lat'])
                    venue.longitude = float(data[0]['lon'])
                    db.commit()
                    print(f"[OK Addr] -> {venue.latitude}, {venue.longitude}")
                else:
                    print(f"[FAILED]")
        except Exception as e:
            print(f"[ERR]: {e}")
            
        time.sleep(1.5)  # Respect Nominatim rate limits

    print("Geocoding complete.")
    db.close()

if __name__ == "__main__":
    update_coordinates()
