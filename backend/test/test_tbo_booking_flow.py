"""
TBO Hotel API — End-to-End Booking Flow Test
=============================================
Walks through the full hotel booking pipeline:
  1. Fetch hotel codes for a city      (TBOHotelCodeList)
  2. Search hotels with availability   (Search)
  3. Pre-book to confirm pricing       (PreBook)
  4. Book with dummy guest details     (Book)
  5. Get booking details               (BookingDetail)

Run: python backend/test/test_tbo_booking_flow.py

⚠️  Uses STAGING credentials — no real charges will occur.
"""

import json
import logging
import os
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

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("tbo_booking")


def api_post(endpoint: str, payload: dict) -> dict:
    """POST to TBO and return JSON."""
    url = f"{BASE_URL}/{endpoint}"
    log.info("POST %s", url)
    resp = requests.post(url, json=payload, auth=AUTH, headers=HEADERS, timeout=60)
    log.info("HTTP %d", resp.status_code)
    if resp.status_code >= 400:
        log.error("Error body: %s", resp.text[:1000])
    resp.raise_for_status()
    return resp.json()


# ======================== STEPS ========================

def step_0_get_hotel_codes(city_code: str = "418069"):
    """Step 0 — Fetch hotel codes for Delhi NCR."""
    log.info("═" * 65)
    log.info("STEP 0: Get Hotel Codes (TBOHotelCodeList)")
    log.info("═" * 65)

    data = api_post("TBOHotelCodeList", {
        "CityCode": city_code,
        "IsDetailedResponse": True,
    })
    hotels = data.get("Hotels", [])
    log.info("Total hotel codes: %d", len(hotels))

    # Return first 50 codes
    codes = [h["HotelCode"] for h in hotels[:50]]
    log.info("Using first %d codes for search", len(codes))
    return codes


def step_1_search(hotel_codes: list):
    """Step 1 — Search hotels with availability."""
    log.info("═" * 65)
    log.info("STEP 1: Hotel Search")
    log.info("═" * 65)

    checkin = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    checkout = (datetime.now() + timedelta(days=32)).strftime("%Y-%m-%d")
    log.info("Dates: %s → %s", checkin, checkout)

    payload = {
        "CheckIn": checkin,
        "CheckOut": checkout,
        "NoOfRooms": "1",
        "GuestNationality": "IN",
        "PaxRooms": [{"Adults": 2, "Children": 0, "ChildrenAges": None}],
        "ResponseTime": 23.0,
        "IsDetailedResponse": True,
        "Filters": {"Refundable": False, "NoOfRooms": 0, "MealType": 0},
        "HotelCodes": ",".join(hotel_codes),
    }

    data = api_post("Search", payload)
    status = data.get("Status", {})
    log.info("Status: %s — %s", status.get("Code"), status.get("Description"))

    trace_id = data.get("TraceId", "")
    results = data.get("HotelResult", [])

    if not isinstance(results, list) or not results:
        log.warning("No hotels with availability.")
        return None

    log.info("Hotels with availability: %d | TraceId: %s", len(results), trace_id)

    # Pick the first hotel with rooms
    first = results[0]
    rooms = first.get("Rooms", [])
    booking_code = rooms[0].get("BookingCode", "") if rooms else ""

    log.info("Selected hotel: Code=%s | Rooms=%d",
             first.get("HotelCode"), len(rooms))
    if rooms:
        r0 = rooms[0]
        room_name = r0.get("Name", ["N/A"])
        if isinstance(room_name, list):
            room_name = room_name[0]
        log.info("  Room: %s | Fare: %s %s | BookingCode: %s",
                 room_name, r0.get("TotalFare"), first.get("Currency", ""),
                 booking_code[:50])

    return {
        "trace_id": trace_id,
        "hotel_code": first.get("HotelCode"),
        "booking_code": booking_code,
        "full_response": data,
    }


def step_2_pre_book(booking_code: str, trace_id: str):
    """Step 2 — Pre-book to confirm pricing."""
    log.info("═" * 65)
    log.info("STEP 2: Pre-Book")
    log.info("═" * 65)

    payload = {
        "BookingCode": booking_code,
        "TraceId": trace_id,
    }
    data = api_post("PreBook", payload)

    status = data.get("Status", {})
    log.info("Status: %s — %s", status.get("Code"), status.get("Description"))
    log.info("Response:\n%s", json.dumps(data, indent=2)[:2000])
    return data


def step_3_book(booking_code: str, trace_id: str):
    """Step 3 — Book with dummy guest details (staging only)."""
    log.info("═" * 65)
    log.info("STEP 3: Hotel Book (Staging — no real charges)")
    log.info("═" * 65)

    payload = {
        "BookingCode": booking_code,
        "TraceId": trace_id,
        "Passengers": [
            {
                "Title": "Mr",
                "FirstName": "Test",
                "MiddleName": "",
                "LastName": "User",
                "Phoneno": "9999999999",
                "Email": "test@meili.ai",
                "PaxType": 1,
                "LeadPassenger": True,
                "Age": 30,
                "PassportNo": "",
                "PassportIssueDate": "",
                "PassportExpDate": "",
                "PAN": "",
            }
        ],
    }

    data = api_post("Book", payload)

    status = data.get("Status", {})
    log.info("Status: %s — %s", status.get("Code"), status.get("Description"))

    book_result = data.get("BookResult", {})
    booking_status = book_result.get("BookingStatus", "N/A")
    confirmation_no = book_result.get("ConfirmationNo", "N/A")
    booking_id = book_result.get("BookingId", "")

    log.info("Booking Status : %s", booking_status)
    log.info("Confirmation # : %s", confirmation_no)
    log.info("Booking ID     : %s", booking_id)
    log.info("Response:\n%s", json.dumps(data, indent=2)[:3000])

    return data


def step_4_booking_detail(booking_id: str):
    """Step 4 — Look up booking details."""
    if not booking_id:
        log.warning("Skipping — no booking ID available.")
        return None

    log.info("═" * 65)
    log.info("STEP 4: Booking Detail — ID: %s", booking_id)
    log.info("═" * 65)

    data = api_post("BookingDetail", {"BookingId": booking_id})
    log.info("Response:\n%s", json.dumps(data, indent=2)[:3000])
    return data


# ======================== RUNNER ========================

def main():
    log.info("🚀 TBO End-to-End Booking Flow Test")
    log.info("Base: %s | User: %s", BASE_URL, USERNAME)
    log.info("Time: %s", datetime.now().isoformat())
    log.info("")

    # Step 0: Get hotel codes
    hotel_codes = step_0_get_hotel_codes()
    if not hotel_codes:
        log.error("❌ Cannot proceed — no hotel codes.")
        return
    log.info("")

    # Step 1: Search
    search_result = step_1_search(hotel_codes)
    if not search_result:
        log.error("❌ Cannot proceed — no available hotels.")
        return
    log.info("")

    trace_id = search_result["trace_id"]
    booking_code = search_result["booking_code"]

    if not trace_id or not booking_code:
        log.error("❌ Missing TraceId or BookingCode — cannot proceed.")
        return

    # Step 2: Pre-book
    try:
        step_2_pre_book(booking_code, trace_id)
    except Exception as e:
        log.error("Pre-Book FAILED: %s", e)
    log.info("")

    # Step 3: Book (staging)
    booking_data = None
    try:
        booking_data = step_3_book(booking_code, trace_id)
    except Exception as e:
        log.error("Book FAILED: %s", e)
    log.info("")

    # Step 4: Booking detail
    if booking_data:
        bid = str(booking_data.get("BookResult", {}).get("BookingId", ""))
        try:
            step_4_booking_detail(bid)
        except Exception as e:
            log.error("BookingDetail FAILED: %s", e)

    log.info("")
    log.info("✅ Booking Flow Test Complete")

    # Save full trace
    output_path = os.path.join(os.path.dirname(__file__), "tbo_booking_flow_results.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "search_result": search_result.get("full_response") if search_result else None,
            "booking_data": booking_data,
        }, f, indent=2, ensure_ascii=False, default=str)
    log.info("📁 Results saved → %s", output_path)


if __name__ == "__main__":
    main()
