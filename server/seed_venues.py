import json
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Court, Sport, Venue

SPORT_NAME_MAP = {
    "badminton": "Badminton",
    "football": "Football",
    "pickleball": "Pickleball",
    "tennis": "Tennis",
}

DEFAULT_PRICES = {
    "badminton": 120000,
    "football": 350000,
    "pickleball": 150000,
    "tennis": 200000,
}

PRICE_LABELS = {
    "badminton": "100.000đ - 150.000đ/h",
    "football": "300.000đ - 450.000đ/h",
    "pickleball": "120.000đ - 180.000đ/h",
    "tennis": "180.000đ - 250.000đ/h",
}


def seed_venues():
    db = SessionLocal()

    json_path = os.path.join(os.path.dirname(__file__), "venues_seed_data.json")
    if not os.path.exists(json_path):
        print(f"Error: {json_path} does not exist.")
        db.close()
        return

    with open(json_path, "r", encoding="utf-8") as f:
        venues_data = json.load(f)

    print(f"Loaded {len(venues_data)} venues from {json_path}")

    # Cache sports by name
    sports = {s.name.lower(): s for s in db.query(Sport).all()}

    venues_created = 0
    venues_updated = 0
    courts_created = 0

    try:
        for item in venues_data:
            sport_key = item.get("sport", "badminton").lower()
            mapped_sport_name = SPORT_NAME_MAP.get(sport_key, "Badminton")
            sport_obj = sports.get(mapped_sport_name.lower())

            if not sport_obj:
                print(f"Warning: Sport '{mapped_sport_name}' not found in database. Skipping.")
                continue

            venue = db.query(Venue).filter_by(name=item["name"]).first()
            if not venue:
                venue = Venue(
                    name=item["name"],
                    address=item["address"],
                    latitude=item["lat"],
                    longitude=item["lng"],
                    sport_key=sport_key,
                    price_label=PRICE_LABELS.get(sport_key, "100.000đ - 200.000đ/h"),
                    court_count=4,
                    description=f"Sân thể thao {mapped_sport_name} uy tín, chất lượng tại TP.HCM.",
                    is_active=True,
                )
                db.add(venue)
                db.flush()
                venues_created += 1
            else:
                # Update with exact coordinates and verified address
                venue.latitude = item["lat"]
                venue.longitude = item["lng"]
                venue.address = item["address"]
                venue.sport_key = sport_key
                if not venue.price_label:
                    venue.price_label = PRICE_LABELS.get(sport_key, "100.000đ - 200.000đ/h")
                venue.is_active = True
                venues_updated += 1

            # Ensure at least 1-2 courts exist for this venue
            existing_courts = db.query(Court).filter_by(venue_id=venue.id).all()
            if not existing_courts:
                for i in range(1, 3):
                    court = Court(
                        venue_id=venue.id,
                        name=f"Sân {mapped_sport_name} {i}",
                        sport_id=sport_obj.id,
                        price_per_hour=DEFAULT_PRICES.get(sport_key, 120000),
                        is_active=True,
                    )
                    db.add(court)
                    courts_created += 1

        db.commit()
        print(f"Seed complete:")
        print(f"- Venues created: {venues_created}")
        print(f"- Venues updated: {venues_updated}")
        print(f"- Courts created: {courts_created}")
        print(f"- Total active venues in DB: {db.query(Venue).filter_by(is_active=True).count()}")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_venues()
