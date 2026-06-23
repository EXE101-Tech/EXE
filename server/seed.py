import datetime
from app.database import SessionLocal, engine, Base
from app import models

def seed_data():
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Bắt đầu khởi tạo dữ liệu mẫu...")
        
        # 1. Seed Sports
        sports_data = [
            {"name": "Cầu lông", "icon_url": "https://cdn-icons-png.flaticon.com/512/3208/3208447.png"},
            {"name": "Pickleball", "icon_url": "https://cdn-icons-png.flaticon.com/512/10398/10398007.png"},
            {"name": "Bóng đá", "icon_url": "https://cdn-icons-png.flaticon.com/512/33/33736.png"},
            {"name": "Tennis", "icon_url": "https://cdn-icons-png.flaticon.com/512/2857/2857434.png"}
        ]
        
        sports = {}
        for sp in sports_data:
            existing = db.query(models.Sport).filter(models.Sport.name == sp["name"]).first()
            if not existing:
                sport = models.Sport(name=sp["name"], icon_url=sp["icon_url"])
                db.add(sport)
                db.flush()
                sports[sp["name"]] = sport
                print(f"Đã thêm môn thể thao: {sp['name']}")
            else:
                sports[sp["name"]] = existing
                
        # 2. Seed Users & Profiles
        users_data = [
            {"email": "huy.pham@proton.com", "name": "Phạm Gia Huy", "role": "Host"},
            {"email": "an.nguyen@proton.com", "name": "Nguyễn Văn A", "role": "Player"},
            {"email": "thi.b@proton.com", "name": "Trần Thị B", "role": "Player"}
        ]
        
        from app.auth_utils import get_password_hash
        default_pwd_hash = get_password_hash("123456")
        
        seeded_users = []
        for u in users_data:
            existing = db.query(models.User).filter(models.User.email == u["email"]).first()
            if not existing:
                user = models.User(email=u["email"], password_hash=default_pwd_hash)
                db.add(user)
                db.flush()
                
                profile = models.UserProfile(
                    user_id=user.id,
                    full_name=u["name"],
                    gender="Male" if "Huy" in u["name"] or "A" in u["name"] else "Female",
                    bio=f"Tôi yêu thích thể thao, đặc biệt là môn {list(sports.keys())[0]}!",
                    city="Hồ Chí Minh",
                    district="Quận 7",
                    latitude=10.7300,
                    longitude=106.7200
                )
                db.add(profile)
                db.flush()
                seeded_users.append(user)
                print(f"Đã thêm người dùng: {u['name']} ({u['email']})")
            else:
                seeded_users.append(existing)
                
        # 3. Seed User Sports
        for user in seeded_users:
            for s_name, sport in sports.items():
                existing = db.query(models.UserSport).filter(
                    models.UserSport.user_id == user.id,
                    models.UserSport.sport_id == sport.id
                ).first()
                if not existing:
                    user_sport = models.UserSport(
                        user_id=user.id,
                        sport_id=sport.id,
                        skill_level="Intermediate" if user.email == "huy.pham@proton.com" else "Beginner",
                        rating=5.0,
                        games_played=5 if user.email == "huy.pham@proton.com" else 1
                    )
                    db.add(user_sport)
                    db.flush()
                    
        # 4. Seed Venues & Courts
        venues_data = [
            {
                "name": "Sân Cầu Lông Hoàng Long",
                "address": "25/1 Đường số 10, Tân Quy, Quận 7, TP. HCM",
                "lat": 10.7423,
                "lng": 106.7115,
                "desc": "Sân cầu lông thảm chuẩn quốc tế, trần cao thoáng mát.",
                "courts": ["Sân 1", "Sân 2", "Sân 3"]
            },
            {
                "name": "Câu lạc bộ Pickleball Phú Mỹ Hưng",
                "address": "Đường Nguyễn Văn Linh, Tân Phong, Quận 7, TP. HCM",
                "lat": 10.7289,
                "lng": 106.7082,
                "desc": "Cụm sân Pickleball ngoài trời và có mái che hiện đại.",
                "courts": ["Sân A", "Sân B"]
            }
        ]
        
        for v in venues_data:
            existing = db.query(models.Venue).filter(models.Venue.name == v["name"]).first()
            if not existing:
                venue = models.Venue(
                    name=v["name"],
                    address=v["address"],
                    latitude=v["lat"],
                    longitude=v["lng"],
                    description=v["desc"],
                    owner_id=seeded_users[0].id
                )
                db.add(venue)
                db.flush()
                print(f"Đã thêm cụm sân: {v['name']}")
                
                # Seed Courts
                for c_name in v["courts"]:
                    sport_name = "Cầu lông" if "Cầu Lông" in v["name"] else "Pickleball"
                    price = 120000.0 if sport_name == "Cầu lông" else 180000.0
                    court = models.Court(
                        venue_id=venue.id,
                        name=c_name,
                        sport_id=sports[sport_name].id,
                        price_per_hour=price
                    )
                    db.add(court)
                    db.flush()
                    print(f"  -> Đã thêm sân con: {c_name} ({sport_name}) - Giá: {price} VNĐ/h")
            else:
                venue = existing
                
        # 5. Seed Matches & Match Participants
        # Let's check if we have any court to create a match
        any_court = db.query(models.Court).first()
        if any_court:
            existing_match = db.query(models.Match).filter(models.Match.title == "Giao lưu cầu lông đôi nam nữ tối nay").first()
            if not existing_match:
                # Create a match tonight
                today = models.utc_now_naive().replace(hour=19, minute=0, second=0, microsecond=0)
                match = models.Match(
                    host_id=seeded_users[0].id,
                    sport_id=any_court.sport_id,
                    court_id=any_court.id,
                    title="Giao lưu cầu lông đôi nam nữ tối nay",
                    description="Cần tìm thêm 2 bạn trình độ trung bình khá chơi giao lưu vui vẻ.",
                    required_level="Intermediate",
                    start_time=today,
                    end_time=today + datetime.timedelta(hours=2),
                    max_players=4,
                    status="OPEN"
                )
                db.add(match)
                db.flush()
                
                db_host_part = models.MatchParticipant(
                    match_id=match.id,
                    user_id=seeded_users[0].id,
                    role="HOST",
                    status="APPROVED"
                )
                db.add(db_host_part)
                
                db_player_part = models.MatchParticipant(
                    match_id=match.id,
                    user_id=seeded_users[1].id,
                    role="PLAYER",
                    status="APPROVED"
                )
                db.add(db_player_part)
                db.flush()
                print(f"Đã tạo trận đấu mẫu: {match.title}")

        db.commit()
        print("Hoàn tất cài đặt dữ liệu mẫu thành công!")
    except Exception as e:
        db.rollback()
        print(f"Có lỗi khi khởi tạo dữ liệu: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
