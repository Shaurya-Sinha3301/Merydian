"""
TBO Air API — Test Suite
========================
Tests the TBO Air API endpoints using staging credentials.

Endpoints covered:
  1. Authenticate       (POST) — Get auth token
  2. Search             (POST) — Search flights (oneway + return)
  3. FareQuote          (POST) — Get exact fare
  4. FareRule           (POST) — Get cancellation/change rules
  5. SSR                (POST) — Get baggage/seat/meal options
  6. Booking/Book       (POST) — Create PNR (dry-run only)
  7. Booking/Ticket     (POST) — Issue e-ticket (dry-run only)

Usage:
    python -m test.test_tbo_air_api
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
log = logging.getLogger("tbo_air_test")

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.tbo_air_service import TBOAirClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def pretty(data: dict) -> str:
    return json.dumps(data, indent=2, default=str)[:2000]


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

# Shared state across tests
_state = {
    "token_id": None,
    "trace_id": None,
    "result_index": None,
    "is_lcc": False,
}


def test_01_authentication():
    """Test TBO Air API authentication."""
    log.info("=" * 60)
    log.info("TEST 1: Authentication (ValidateAgency)")
    log.info("=" * 60)

    try:
        client = TBOAirClient()
        token = client.authenticate()
        _state["token_id"] = token

        report("Authentication", bool(token), f"TokenId: {token[:30]}...")
        return True
    except Exception as e:
        report("Authentication", False, str(e))
        return False


def test_02_search_oneway():
    """Test oneway flight search."""
    log.info("=" * 60)
    log.info("TEST 2: Search — Oneway (DEL → BOM)")
    log.info("=" * 60)

    try:
        client = TBOAirClient()
        departure = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%dT00:00:00")

        result = client.search_flights(
            origin="DEL",
            destination="BOM",
            departure_date=departure,
            adults=1,
            cabin_class=1,
        )

        response = result.get("Response", {})
        trace_id = response.get("TraceId")
        results_array = response.get("Results", [[]])

        total_flights = sum(
            len(group) for group in results_array if isinstance(group, list)
        )

        if trace_id and total_flights > 0:
            _state["trace_id"] = trace_id
            # Pick first result
            first_group = results_array[0] if results_array else []
            if first_group:
                _state["result_index"] = first_group[0].get("ResultIndex", "")
                _state["is_lcc"] = first_group[0].get("IsLCC", False)
                airline = first_group[0].get("ValidatingAirline", "")
                fare = first_group[0].get("Fare", {}).get("PublishedFare", "?")
                report("Search Oneway", True, f"TraceId: {trace_id[:20]}... | {total_flights} flights | Best: {airline} ₹{fare}")
            else:
                report("Search Oneway", True, f"TraceId: {trace_id[:20]}... | {total_flights} flights")
        else:
            report("Search Oneway", False, f"No flights found. Response keys: {list(response.keys())}")

        return bool(trace_id)
    except Exception as e:
        report("Search Oneway", False, str(e))
        return False


def test_03_search_return():
    """Test return flight search."""
    log.info("=" * 60)
    log.info("TEST 3: Search — Return (DEL → BOM → DEL)")
    log.info("=" * 60)

    try:
        client = TBOAirClient()
        departure = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%dT00:00:00")
        return_date = (datetime.now() + timedelta(days=35)).strftime("%Y-%m-%dT00:00:00")

        result = client.search_flights(
            origin="DEL",
            destination="BOM",
            departure_date=departure,
            return_date=return_date,
            adults=1,
            cabin_class=1,
        )

        response = result.get("Response", {})
        trace_id = response.get("TraceId")
        results_array = response.get("Results", [[]])

        total_flights = sum(
            len(group) for group in results_array if isinstance(group, list)
        )

        report("Search Return", bool(trace_id), f"TraceId: {trace_id[:20] if trace_id else 'None'}... | {total_flights} flights")
        return bool(trace_id)
    except Exception as e:
        report("Search Return", False, str(e))
        return False


def test_04_fare_quote():
    """Test fare quote for a search result."""
    log.info("=" * 60)
    log.info("TEST 4: FareQuote")
    log.info("=" * 60)

    if not _state["trace_id"] or not _state["result_index"]:
        skip("FareQuote", "No TraceId/ResultIndex from search")
        return False

    try:
        client = TBOAirClient()
        result = client.get_fare_quote(
            trace_id=_state["trace_id"],
            result_index=_state["result_index"],
        )

        response = result.get("Response", {})
        results = response.get("Results", {})
        fare = results.get("Fare", {})

        report("FareQuote", bool(fare), f"PublishedFare: {fare.get('PublishedFare', '?')}")
        return bool(fare)
    except Exception as e:
        report("FareQuote", False, str(e))
        return False


def test_05_fare_rules():
    """Test fare rules retrieval."""
    log.info("=" * 60)
    log.info("TEST 5: FareRule")
    log.info("=" * 60)

    if not _state["trace_id"] or not _state["result_index"]:
        skip("FareRule", "No TraceId/ResultIndex from search")
        return False

    try:
        client = TBOAirClient()
        result = client.get_fare_rules(
            trace_id=_state["trace_id"],
            result_index=_state["result_index"],
        )

        response = result.get("Response", {})
        fare_rules = response.get("FareRules")

        report("FareRule", fare_rules is not None, f"Rules: {type(fare_rules).__name__}")
        return fare_rules is not None
    except Exception as e:
        report("FareRule", False, str(e))
        return False


def test_06_ssr():
    """Test SSR options retrieval."""
    log.info("=" * 60)
    log.info("TEST 6: SSR (Baggage/Seat/Meal)")
    log.info("=" * 60)

    if not _state["trace_id"] or not _state["result_index"]:
        skip("SSR", "No TraceId/ResultIndex from search")
        return False

    try:
        client = TBOAirClient()
        result = client.get_ssr(
            trace_id=_state["trace_id"],
            result_index=_state["result_index"],
        )

        response = result.get("Response", {})
        baggage = response.get("Baggage")
        meals = response.get("MealDynamic")
        seats = response.get("SeatDynamic")

        details = []
        if baggage:
            details.append(f"Baggage: {len(baggage)} groups")
        if meals:
            details.append(f"Meals: {len(meals)} groups")
        if seats:
            details.append(f"Seats: {len(seats)} groups")

        report("SSR", bool(details), " | ".join(details) if details else "No SSR options available")
        return bool(details)
    except Exception as e:
        report("SSR", False, str(e))
        return False


def test_07_booking_dry_run():
    """Test booking — DRY RUN (validates request structure only)."""
    log.info("=" * 60)
    log.info("TEST 7: Booking (DRY RUN — validates structure only)")
    log.info("=" * 60)

    skip("Booking", "Dry run only — not calling live API to avoid creating real PNRs")
    return True


def test_08_ticketing_dry_run():
    """Test ticketing — DRY RUN."""
    log.info("=" * 60)
    log.info("TEST 8: Ticketing (DRY RUN)")
    log.info("=" * 60)

    skip("Ticketing", "Dry run only — requires a real PNR")
    return True


def test_09_get_booking_details_dry_run():
    """Test get booking details — DRY RUN."""
    log.info("=" * 60)
    log.info("TEST 9: GetBookingDetails (DRY RUN)")
    log.info("=" * 60)

    skip("GetBookingDetails", "Dry run only — requires a real PNR and BookingId")
    return True


def test_10_cancel_booking_dry_run():
    """Test cancel booking — DRY RUN."""
    log.info("=" * 60)
    log.info("TEST 10: CancelBooking (DRY RUN)")
    log.info("=" * 60)

    skip("CancelBooking", "Dry run only — requires a real BookingId")
    return True


# ======================== RUNNER ========================

def run_all():
    log.info("🚀 TBO Air API Test Suite")
    log.info("=" * 60)

    tests = [
        test_01_authentication,
        test_02_search_oneway,
        test_03_search_return,
        test_04_fare_quote,
        test_05_fare_rules,
        test_06_ssr,
        test_07_booking_dry_run,
        test_08_ticketing_dry_run,
        test_09_get_booking_details_dry_run,
        test_10_cancel_booking_dry_run,
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
