"""
TBO Hotel API — Comprehensive Testing Suite
============================================
Tests the TBO Holidays Hotel API endpoints using staging credentials.

Endpoints covered:
  1. CountryList          (GET)  — List all supported countries
  2. CityList             (POST) — Cities for a given country
  3. TBOHotelCodeList     (POST) — Hotel codes for a given city
  4. Search               (POST) — Search hotel availability + pricing
  5. Hoteldetails         (POST) — Detailed hotel info by code

API Base URL : http://api.tbotechnology.in/TBOHolidays_HotelAPI
Auth         : Basic Auth (username / password)
"""

import sys
import os
import json
import logging
import requests
from requests.auth import HTTPBasicAuth
from datetime import datetime, timedelta

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
TBO_BASE_URL = "http://api.tbotechnology.in/TBOHolidays_HotelAPI"
TBO_USERNAME = "hackathontest"
TBO_PASSWORD = "Hac@98147521"

AUTH = HTTPBasicAuth(TBO_USERNAME, TBO_PASSWORD)
HEADERS = {"Content-Type": "application/json", "Accept": "application/json"}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("tbo_test")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def pretty(data: dict) -> str:
    return json.dumps(data, indent=2, ensure_ascii=False)


def api_get(endpoint: str) -> dict:
    """GET from TBO API."""
    url = f"{TBO_BASE_URL}/{endpoint}"
    log.info("GET  %s", url)
    resp = requests.get(url, auth=AUTH, headers=HEADERS, timeout=30)
    log.info("HTTP %s", resp.status_code)
    resp.raise_for_status()
    return resp.json()


def api_post(endpoint: str, payload: dict) -> dict:
    """POST to TBO API."""
    url = f"{TBO_BASE_URL}/{endpoint}"
    log.info("POST %s", url)
    resp = requests.post(url, json=payload, auth=AUTH, headers=HEADERS, timeout=60)
    log.info("HTTP %s", resp.status_code)
    resp.raise_for_status()
    return resp.json()


# ======================== TESTS ========================

def test_country_list():
    """1. GET /CountryList → list of all supported countries."""
    log.info("=" * 65)
    log.info("TEST 1: CountryList (GET)")
    log.info("=" * 65)

    data = api_get("CountryList")
    countries = data.get("CountryList", [])
    log.info("Total countries: %d", len(countries))
    for c in countries[:10]:
        log.info("  %s — %s", c.get("Code", "?"), c.get("Name", "?"))

    assert len(countries) > 0, "Expected at least 1 country"
    log.info("✅ CountryList — PASSED (%d countries)", len(countries))
    return countries


def test_city_list(country_code: str = "IN"):
    """2. POST /CityList → cities in a given country."""
    log.info("=" * 65)
    log.info("TEST 2: CityList (POST) — Country: %s", country_code)
    log.info("=" * 65)

    data = api_post("CityList", {"CountryCode": country_code})
    status = data.get("Status", {})
    log.info("Status: %s — %s", status.get("Code"), status.get("Description"))

    cities = data.get("CityList", [])
    log.info("Total cities: %d", len(cities))
    for c in cities[:10]:
        log.info("  %s — %s", c.get("Code", "?"), c.get("Name", "?"))

    assert len(cities) > 0, "Expected at least 1 city"
    log.info("✅ CityList — PASSED (%d cities for %s)", len(cities), country_code)
    return cities


def test_hotel_code_list(city_code: str = "418069", city_name: str = "Delhi NCR"):
    """3. POST /TBOHotelCodeList → hotel codes for a city."""
    log.info("=" * 65)
    log.info("TEST 3: TBOHotelCodeList (POST) — City: %s (%s)", city_name, city_code)
    log.info("=" * 65)

    data = api_post("TBOHotelCodeList", {
        "CityCode": city_code,
        "IsDetailedResponse": True,
    })
    status = data.get("Status", {})
    log.info("Status: %s — %s", status.get("Code"), status.get("Description"))

    hotels = data.get("Hotels", [])
    log.info("Total hotel codes: %d", len(hotels))
    for h in hotels[:10]:
        log.info("  Code: %-10s | ⭐ %-12s | %s",
                 h.get("HotelCode", "?"),
                 h.get("HotelRating", "?"),
                 h.get("HotelName", "?"))

    assert len(hotels) > 0, "Expected at least 1 hotel code"
    log.info("✅ TBOHotelCodeList — PASSED (%d hotels in %s)", len(hotels), city_name)
    return hotels


def test_hotel_search(hotel_codes_csv: str, nights: int = 2):
    """4. POST /Search → search hotels with availability & pricing."""
    log.info("=" * 65)
    log.info("TEST 4: Search (POST) — %d hotel codes, %d nights",
             len(hotel_codes_csv.split(",")), nights)
    log.info("=" * 65)

    checkin = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    checkout = (datetime.now() + timedelta(days=30 + nights)).strftime("%Y-%m-%d")

    payload = {
        "CheckIn": checkin,
        "CheckOut": checkout,
        "NoOfRooms": "1",
        "GuestNationality": "IN",
        "PaxRooms": [{"Adults": 2, "Children": 0, "ChildrenAges": None}],
        "ResponseTime": 23.0,
        "IsDetailedResponse": True,
        "Filters": {"Refundable": False, "NoOfRooms": 0, "MealType": 0},
        "HotelCodes": hotel_codes_csv,
    }

    data = api_post("Search", payload)
    status = data.get("Status", {})
    log.info("Status: %s — %s", status.get("Code"), status.get("Description"))

    trace_id = data.get("TraceId", "")
    results = data.get("HotelResult", [])

    if not isinstance(results, list):
        log.warning("HotelResult is not a list. Full response:\n%s", pretty(data)[:2000])
        return data

    log.info("Hotels with availability: %d | TraceId: %s", len(results), trace_id)

    for i, h in enumerate(results[:10], 1):
        code = h.get("HotelCode", "?")
        currency = h.get("Currency", "USD")
        rooms = h.get("Rooms", [])
        cheapest = min(rooms, key=lambda r: r.get("TotalFare", 9999999)) if rooms else {}
        log.info("")
        log.info("  %d. HotelCode: %s | Currency: %s", i, code, currency)
        if cheapest:
            room_name = cheapest.get("Name", ["N/A"])
            if isinstance(room_name, list):
                room_name = room_name[0] if room_name else "N/A"
            log.info("     💰 Best: %s %s (tax: %s) | %s",
                     currency, cheapest.get("TotalFare"),
                     cheapest.get("TotalTax"), room_name)
            log.info("     📋 Meal: %s | Refundable: %s | BookingCode: %s",
                     cheapest.get("MealType", "N/A"),
                     cheapest.get("IsRefundable", "?"),
                     cheapest.get("BookingCode", "")[:50])

    if results:
        log.info("✅ Search — PASSED (%d hotels found)", len(results))
    else:
        log.info("⚠️ Search — No availability (API responded correctly)")

    return data


def test_hotel_details(hotel_code: str):
    """5. POST /Hoteldetails → detailed info for a single hotel."""
    log.info("=" * 65)
    log.info("TEST 5: Hoteldetails (POST) — Code: %s", hotel_code)
    log.info("=" * 65)

    data = api_post("Hoteldetails", {
        "Hotelcodes": hotel_code,
        "Language": "EN",
    })
    status = data.get("Status", {})
    log.info("Status: %s — %s", status.get("Code"), status.get("Description"))

    details = data.get("HotelDetails", [])
    if isinstance(details, list) and details:
        d = details[0]
        log.info("  Name    : %s", d.get("HotelName", "N/A"))
        log.info("  Rating  : %s", d.get("HotelRating", "N/A"))
        log.info("  Address : %s", d.get("Address", "N/A"))
        log.info("  City    : %s", d.get("CityName", "N/A"))
        log.info("  Country : %s", d.get("CountryName", "N/A"))
        log.info("  Desc    : %s...", str(d.get("Description", ""))[:200])
        log.info("✅ Hoteldetails — PASSED")
    else:
        log.info("Response:\n%s", pretty(data)[:2000])
        log.info("⚠️ Hoteldetails — No details returned")

    return data


# ======================== RUNNER ========================

def run_all():
    log.info("🚀 TBO Hotel API — Full Test Suite")
    log.info("Base URL : %s", TBO_BASE_URL)
    log.info("User     : %s", TBO_USERNAME)
    log.info("Time     : %s", datetime.now().isoformat())
    log.info("")

    summary = {}

    # 1. Country list
    try:
        countries = test_country_list()
        summary["country_list"] = f"PASS — {len(countries)} countries"
    except Exception as e:
        log.error("CountryList FAILED: %s", e)
        summary["country_list"] = f"FAIL — {e}"
    log.info("")

    # 2. City list (India)
    cities = []
    try:
        cities = test_city_list("IN")
        summary["city_list"] = f"PASS — {len(cities)} cities"
    except Exception as e:
        log.error("CityList FAILED: %s", e)
        summary["city_list"] = f"FAIL — {e}"
    log.info("")

    # 3. Hotel code list (Delhi NCR)
    hotels_meta = []
    try:
        hotels_meta = test_hotel_code_list("418069", "Delhi NCR")
        summary["hotel_code_list"] = f"PASS — {len(hotels_meta)} hotels"
    except Exception as e:
        log.error("TBOHotelCodeList FAILED: %s", e)
        summary["hotel_code_list"] = f"FAIL — {e}"
    log.info("")

    # 4. Hotel search (first 50 codes)
    search_data = None
    if hotels_meta:
        codes_csv = ",".join([h["HotelCode"] for h in hotels_meta[:50]])
        try:
            search_data = test_hotel_search(codes_csv)
            n = len(search_data.get("HotelResult", []))
            summary["hotel_search"] = f"PASS — {n} hotels with availability"
        except Exception as e:
            log.error("Search FAILED: %s", e)
            summary["hotel_search"] = f"FAIL — {e}"
    else:
        summary["hotel_search"] = "SKIP — no hotel codes"
    log.info("")

    # 5. Hotel details (first hotel with availability)
    if search_data:
        results = search_data.get("HotelResult", [])
        if results:
            code = results[0].get("HotelCode", "")
            try:
                test_hotel_details(code)
                summary["hotel_details"] = f"PASS — {code}"
            except Exception as e:
                log.error("Hoteldetails FAILED: %s", e)
                summary["hotel_details"] = f"FAIL — {e}"
        else:
            summary["hotel_details"] = "SKIP — no search results"
    else:
        summary["hotel_details"] = "SKIP — no search data"
    log.info("")

    # Print summary
    log.info("=" * 65)
    log.info("  SUMMARY")
    log.info("=" * 65)
    for test_name, result in summary.items():
        icon = "✅" if "PASS" in result else ("⚠️" if "SKIP" in result else "❌")
        log.info("  %s %-20s %s", icon, test_name, result)
    log.info("=" * 65)

    # Save results
    output_path = os.path.join(os.path.dirname(__file__), "tbo_test_results.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({"summary": summary, "timestamp": datetime.now().isoformat()},
                  f, indent=2, ensure_ascii=False, default=str)
    log.info("📁 Results saved → %s", output_path)


if __name__ == "__main__":
    run_all()
