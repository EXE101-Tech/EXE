import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Venue

def fix_coordinates():
    db = SessionLocal()
    venues = db.query(Venue).all()
    
    # EXACT coordinates from Google Maps (verified via browser)
    mapping = {
        # Badminton
        "Trúc Long":                                (10.853155, 106.812963),   # Google Maps exact
        "Tăng Nhơn Phú (Badminton Passion Hub)":    (10.846895, 106.797142),  # Google Maps exact
        "Trạm Cầu Lông":                            (10.838053, 106.782454),  # Google Maps exact
        "Viện Kiểm Sát":                            (10.849254, 106.793904),  # Google Maps exact
        "An Bình":                                   (10.825465, 106.784129),  # Google Maps exact
        
        # Football
        "197 Arena":                                 (10.858231, 106.809658),  # Google Maps exact
        "Long Trường Quận 9":                        (10.805336, 106.810950),  # Google Maps exact
        "Võ Văn Hát":                                (10.817812, 106.805542),  # Google Maps exact
        "185":                                       (10.823777, 106.779078),  # Google Maps exact
        "Tiến Minh":                                 (10.825197, 106.777167),  # Google Maps exact
        
        # Pickleball
        "Song Phát":                                 (10.844436, 106.819735),  # Google Maps exact
        "Prime Pickleball":                          (10.829583, 106.831254),  # Google Maps exact
        "Phong Phú Sport":                           (10.831532, 106.784516),  # Google Maps exact
        "Kenik":                                     (10.838648, 106.829004),  # Google Maps exact
        
        # Tennis
        "TT TDTT Q9":                                (10.845487, 106.787846),  # Google Maps exact
        "Công An Q9":                                (10.849398, 106.775863),  # Google Maps exact
        "Tennis 99":                                 (10.851462, 106.786577),  # Google Maps exact
    }

    updated = 0
    for venue in venues:
        for key, coords in mapping.items():
            if key in venue.name:
                venue.latitude = coords[0]
                venue.longitude = coords[1]
                updated += 1
                break
    
    db.commit()
    print(f"Updated {updated} venues with exact Google Maps coordinates.")
    db.close()

if __name__ == "__main__":
    fix_coordinates()
