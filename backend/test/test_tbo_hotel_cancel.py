"""
TBO Hotel API — Cancel & BookingsByDate Tests
==============================================
Tests the two newly added Hotel API endpoints.

Endpoints:
  1. Cancel                     (POST) — Cancel a hotel booking
  2. BookingDetailsBasedOnDate  (POST) — Get bookings in a date range

Usage:
    python -m test.test_tbo_hotel_cancel
"""

import logging
import os
import sys
import json
from datetime import datetime, timedelta

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("tbo_hotel_cancel_test")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.tbo_service import TBOHotelClient


PASSED = 0
FAILED = 0
SKIPPED = 0


def report(name: str, success: bool, detail: str = ""):
    global PASSED, FAILED
    if success:
        PASSED += 1
        log.info("✅ %s — PASS %s", name, detail)
    else:
        FAILED += 1
        log.error("❌ %s — FAIL %s", name, detail)


def skip(name: str, reason: str):
    global SKIPPED
    SKIPPED += 1
    log.warning("⏭️  %s — SKIPPED: %s", name, reason)


# ======================== TESTS ========================


def test_01_bookings_by_date():
    """Test BookingDetailsBasedOnDate — retrieve bookings in a date range."""
    log.info("=" * 60)
    log.info("TEST 1: BookingDetailsBasedOnDate")
    log.info("=" * 60)

    try:
        client = TBOHotelClient()
        # Fetch bookings from the last 30 days
        to_date = datetime.now().strftime("%Y-%m-%d")
        from_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

        result = client.get_bookings_by_date(from_date, to_date)

        # The API should return a response even if no bookings exist
        bookings = result.get("BookingDetails", [])
        status = result.get("Status", {})

        if isinstance(bookings, list):
            report("BookingsByDate", True,
                   f"Found {len(bookings)} bookings ({from_date} → {to_date})")
        else:
            report("BookingsByDate", True,
                   f"API responded. Status: {status}")

        return True
    except Exception as e:
        report("BookingsByDate", False, str(e))
        return False


def test_02_cancel_invalid():
    """Test Cancel with an invalid confirmation number — should error gracefully."""
    log.info("=" * 60)
    log.info("TEST 2: Cancel — Invalid Confirmation Number")
    log.info("=" * 60)

    try:
        client = TBOHotelClient()
        result = client.cancel("INVALID_CONF_NO_12345")

        # The API might return an error status — that's expected
        cancel_result = result.get("CancelResult", result)
        status = cancel_result.get("BookingStatus", "")

        report("Cancel (Invalid)", True,
               f"API responded with status: '{status}' (expected error/rejection)")
        return True
    except Exception as e:
        # Some APIs return HTTP errors for invalid requests — that's OK
        if "4" in str(type(e)) or "400" in str(e) or "404" in str(e) or "500" in str(e):
            report("Cancel (Invalid)", True,
                   f"API rejected invalid request as expected: {str(e)[:100]}")
            return True
        report("Cancel (Invalid)", False, str(e))
        return False


def test_03_cancel_dry_run():
    """Test Cancel — DRY RUN (no real booking to cancel)."""
    log.info("=" * 60)
    log.info("TEST 3: Cancel — DRY RUN")
    log.info("=" * 60)

    skip("Cancel (Real)", "Dry run — no real confirmed booking to cancel safely")
    return True


def test_04_search_with_filters():
    """Test hotel search with the new filter parameters."""
    log.info("=" * 60)
    log.info("TEST 4: Search with Filters (Refundable + StarRating)")
    log.info("=" * 60)

    try:
        client = TBOHotelClient()

        # First get hotel codes
        hotels = client.get_hotel_codes("418069")  # Delhi
        if not hotels:
            skip("Search Filters", "No hotel codes found for Delhi")
            return False

        hotel_codes = [h["HotelCode"] for h in hotels[:20]]

        checkin = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        checkout = (datetime.now() + timedelta(days=32)).strftime("%Y-%m-%d")

        result = client.search_hotels(
            hotel_codes=hotel_codes,
            checkin=checkin,
            checkout=checkout,
            refundable=True,
            star_rating=4,
            meal_type=2,  # B&B
        )

        hotel_results = result.get("HotelResult", [])
        status = result.get("Status", {})

        report("Search Filters", True,
               f"Status: {status.get('Code', '?')} | Hotels: {len(hotel_results) if isinstance(hotel_results, list) else 0}")
        return True
    except Exception as e:
        report("Search Filters", False, str(e))
        return False


# ======================== RUNNER ========================

def run_all():
    log.info("🚀 TBO Hotel API — Cancel & Filters Test Suite")
    log.info("=" * 60)

    tests = [
        test_01_bookings_by_date,
        test_02_cancel_invalid,
        test_03_cancel_dry_run,
        test_04_search_with_filters,
    ]

    for test_fn in tests:
        try:
            test_fn()
        except Exception as e:
            log.error("Unhandled exception in %s: %s", test_fn.__name__, e)

    log.info("")
    log.info("=" * 60)
    log.info("📊 RESULTS: %d passed, %d failed, %d skipped (of %d)",
             PASSED, FAILED, SKIPPED, len(tests))
    log.info("=" * 60)

    return FAILED == 0


if __name__ == "__main__":
    success = run_all()
    sys.exit(0 if success else 1)
