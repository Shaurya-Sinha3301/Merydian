import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.user import User
from app.models.family import Family
from app.models.itinerary import Itinerary
import json

engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
Session = sessionmaker(bind=engine)
session = Session()

email = "sh1@gmail.com"
user = session.query(User).filter(User.email == email).first()

if user and user.family_id:
    family = session.query(Family).filter(Family.id == user.family_id).first()
    if family and family.current_itinerary_version:
        itinerary = session.query(Itinerary).filter(Itinerary.id == family.current_itinerary_version).first()
        if itinerary:
            data = itinerary.data
            # Print the full itinerary as JSON (limit to first day for readability)
            first_day = data["days"][0] if data.get("days") else {}
            print(json.dumps({
                "top_level": {k: v for k, v in data.items() if k != "days"},
                "day_0": {
                    "day": first_day.get("day"),
                    "region": first_day.get("region"),
                    "pois_count": len(first_day.get("pois", [])),
                    "first_3_pois": first_day.get("pois", [])[:3],
                }
            }, indent=2))

session.close()
