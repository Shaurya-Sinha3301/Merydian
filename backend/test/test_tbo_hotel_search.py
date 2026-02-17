"""
TBO Hotel API — Quick Hotel Search Test
========================================
Searches for hotels in Delhi, Mumbai, and Dubai.
Displays results with pricing and room details.

Run: python backend/test/test_tbo_hotel_search.py
"""

import json
import logging
import requests
from requests.auth import HTTPBasicAuth
from datetime import datetime, timedelta

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_URL = "http://api.tbotechnology.in/TBOHolidays_HotelAPI"
USERNAME = "hackathontest"
PASSWORD = "Hac@98147521"

AUTH = HTTPBasicAuth(USERNAME, PASSWORD)
HEADERS = {"Content-Type": "application/json", "Accept": "application/json"}

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("tbo_search")

# City code mapping (from TBO CityList / TBOHotelCodeList)
CITY_CODES = {
    "Delhi NCR": "418069",
    "Mumbai": "131408",
    "Dubai": "114923",
    "Goa": "130299",
    "Jaipur": "130614",
    "Bangkok": "108048",
}


def get_hotel_codes_for_city(city_code: str, limit: int = 50) -> str:
    """Fetch hotel codes for a city and return as comma-separated string."""
    resp = requests.post(
        f"{BASE_URL}/TBOHotelCodeList",
        json={"CityCode": city_code, "IsDetailedResponse": True},
        auth=AUTH, headers=HEADERS, timeout=30,
    )
    resp.raise_for_status()
    hotels = resp.json().get("Hotels", [])
    return ",".join(h["HotelCode"] for h in hotels[:limit])


def search_hotels(hotel_codes: str, nights: int = 2, rooms: int = 1, adults: int = 2):
    """Search TBO for hotel availability."""
    checkin = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    checkout = (datetime.now() + timedelta(days=30 + nights)).strftime("%Y-%m-%d")

    payload = {
        "CheckIn": checkin,
        "CheckOut": checkout,
        "NoOfRooms": str(rooms),
        "GuestNationality": "IN",
        "PaxRooms": [
            {"Adults": adults, "Children": 0, "ChildrenAges": None}
            for _ in range(rooms)
        ],
        "ResponseTime": 23.0,
        "IsDetailedResponse": True,
        "Filters": {"Refundable": False, "NoOfRooms": 0, "MealType": 0},
        "HotelCodes": hotel_codes,
    }

    resp = requests.post(
        f"{BASE_URL}/Search", json=payload,
        auth=AUTH, headers=HEADERS, timeout=60,
    )
    resp.raise_for_status()
    return resp.json()


def display_results(data: dict, city_name: str):
    """Pretty-print hotel search results."""
    status = data.get("Status", {})
    log.info("API Status: Code=%s — %s", status.get("Code"), status.get("Description"))

    results = data.get("HotelResult", [])
    trace_id = data.get("TraceId", "N/A")

    if not isinstance(results, list) or not results:
        log.warning("No hotels with availability in %s.", city_name)
        return

    log.info("━" * 70)
    log.info("  🏨 %d hotels with availability in %s  |  TraceId: %s",
             len(results), city_name, trace_id)
    log.info("━" * 70)

    for i, h in enumerate(results[:15], 1):
        code = h.get("HotelCode", "?")
        currency = h.get("Currency", "USD")
        rooms = h.get("Rooms", [])

        # Find cheapest room
        if rooms:
            cheapest = min(rooms, key=lambda r: r.get("TotalFare", 9999999))
            room_name = cheapest.get("Name", ["N/A"])
            if isinstance(room_name, list):
                room_name = room_name[0] if room_name else "N/A"
            fare = cheapest.get("TotalFare", "N/A")
            tax = cheapest.get("TotalTax", 0)
            meal = cheapest.get("MealType", "N/A")
            refundable = "✅ Refundable" if cheapest.get("IsRefundable") else "❌ Non-refundable"
            inclusion = cheapest.get("Inclusion", "")
        else:
            room_name = fare = tax = meal = refundable = inclusion = "N/A"

        log.info("")
        log.info("  %2d. HotelCode: %s", i, code)
        log.info("      💰 %s %s (+ %s tax)", currency, fare, tax)
        log.info("      🛏️  %s", room_name)
        log.info("      🍽️  %s | %s", meal, refundable)
        if inclusion:
            log.info("      📦 %s", inclusion)
        log.info("      🏷️  Rooms available: %d", len(rooms))


def run_search_for_city(city_name: str, city_code: str):
    """Run a complete search for one city."""
    log.info("")
    log.info("=" * 70)
    log.info("  🔍 Searching: %s (CityCode: %s)", city_name, city_code)
    log.info("=" * 70)

    try:
        log.info("  Fetching hotel codes...")
        codes = get_hotel_codes_for_city(city_code, limit=50)
        n_codes = len(codes.split(","))
        log.info("  Got %d hotel codes. Searching availability...", n_codes)

        data = search_hotels(codes)
        display_results(data, city_name)

    except requests.exceptions.HTTPError as e:
        log.error("HTTP Error: %s — %s", e.response.status_code, e.response.text[:500])
    except Exception as e:
        log.error("Error: %s", e)


def main():
    log.info("═" * 70)
    log.info("  TBO Hotel Search Test")
    log.info("  Base: %s | User: %s", BASE_URL, USERNAME)
    log.info("═" * 70)

    # Search in multiple cities
    for city_name, city_code in [
        ("Delhi NCR", "418069"),
        ("Mumbai", "131408"),
        ("Dubai", "114923"),
    ]:
        run_search_for_city(city_name, city_code)

    log.info("")
    log.info("✅ All searches complete.")


if __name__ == "__main__":
    main()
