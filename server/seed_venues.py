import sys
import os
import random

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Venue, Court, Sport

def seed_venues():
    db = SessionLocal()

    # District 9 center approx
    BASE_LAT = 10.8427
    BASE_LNG = 106.8041

    sports_map = {
        "Badminton": [
            {"name": "Sân cầu lông Trúc Long Badminton", "address": "75 Hoàng Hữu Nam, Phường Tăng Nhơn Phú, Quận 9"},
            {"name": "Sân Cầu Lông Tăng Nhơn Phú (Badminton Passion Hub)", "address": "591C Đường Lê Văn Việt, Phường Tăng Nhơn Phú, Quận 9"},
            {"name": "Sân Cầu Lông Trạm Cầu Lông", "address": "135/34 Đình Phong Phú, Phường Tăng Nhơn Phú, Quận 9"},
            {"name": "Sân cầu lông Trường Viện Kiểm Sát", "address": "11, Hẻm C24 Đường 449, Phường Tăng Nhơn Phú, Quận 9"},
            {"name": "Sân Cầu Lông An Bình (An Binh Badminton)", "address": "86/2 Đình Phong Phú, Phường Tăng Nhơn Phú, Quận 9"}
        ],
        "Football": [
            {"name": "Sân Bóng Đá 197 Arena", "address": "80c Đường số 197, Phường Tăng Nhơn Phú, Quận 9"},
            {"name": "Sân bóng đá mini Long Trường Quận 9", "address": "Số 45 Bùi Xương Trạch, Phường Long Trường, Quận 9"},
            {"name": "Sân bóng đá Võ Văn Hát", "address": "Đối diện hẻm 225/124 Đường Võ Văn Hát, Phường Long Trường, Quận 9"},
            {"name": "Sân banh 185", "address": "RQFH+GJ8, Đường số 185 (giao đường 339), Phường Phước Long, Quận 9"},
            {"name": "Sân bóng - Trung tâm thể thao Tiến Minh", "address": "Khu tiểu đoàn 41, Hẻm 141 Đường 339, Phường Phước Long, Quận 9"}
        ],
        "Pickleball": [
            {"name": "Pickleball Song Phát Quận 9", "address": "175/13 Nguyễn Văn Tăng, Phường Long Bình, Quận 9"},
            {"name": "Prime Pickleball Quận 9", "address": "12 Đường số 23, Phường Long Bình, Quận 9"},
            {"name": "PPS Pickleball Phong Phú Sport", "address": "261/9 Đình Phong Phú, Khu Phố 3, Phường Tăng Nhơn Phú, Quận 9"},
            {"name": "Kenik Pickleball - Vinhomes Grand Park", "address": "581/10 Nguyễn Xiển, Phường Long Bình, Quận 9"}
        ],
        "Tennis": [
            {"name": "Sân Tennis TT TDTT Q9", "address": "RQWQ+95Q, Phường Tăng Nhơn Phú, Quận 9"},
            {"name": "Sân Tennis Công An Q9", "address": "RQXG+Q85, Tân Lập 1, Phường Tăng Nhơn Phú, Quận 9"},
            {"name": "CLB Sân Tennis 99", "address": "99 Man Thiện, Phường Tăng Nhơn Phú, Quận 9"}
        ]
    }
    
    price_map = {
        "Badminton": 120000,
        "Football": 350000,
        "Pickleball": 150000,
        "Tennis": 200000
    }

    print("Starting seed...")

    for sport_name, locations in sports_map.items():
        sport = db.query(Sport).filter_by(name=sport_name).first()
        if not sport:
            print(f"Warning: Sport {sport_name} not found in DB. Skipping.")
            continue
            
        for loc in locations:
            venue = db.query(Venue).filter_by(name=loc['name']).first()
            if not venue:
                lat = BASE_LAT + random.uniform(-0.015, 0.015)
                lng = BASE_LNG + random.uniform(-0.015, 0.015)
                
                venue = Venue(
                    name=loc['name'],
                    address=loc['address'],
                    latitude=lat,
                    longitude=lng,
                    description=f"{sport_name} court in District 9"
                )
                db.add(venue)
                db.commit()
                db.refresh(venue)
                print(f"Created Venue")
            
            court = db.query(Court).filter_by(venue_id=venue.id, sport_id=sport.id).first()
            if not court:
                court = Court(
                    venue_id=venue.id,
                    name=f"Sân {sport_name} 1",
                    sport_id=sport.id,
                    price_per_hour=price_map.get(sport_name, 100000)
                )
                db.add(court)
                db.commit()
                print(f"Created Court")
                
    print("Seed complete.")
    db.close()

if __name__ == "__main__":
    seed_venues()
