"""
Integration Tests — High-Priority Core Flow Gaps

Tests all 5 previously-missing features:
1. Trip Listing API (GET /trips/)
2. Trip Deletion/Archival (DELETE /trips/{id})
3. Agent Dashboard — Real Data (GET /agent/itinerary/options, POST /agent/itinerary/approve)
4. Booking Execution Flow (POST /bookings/execute, GET /bookings/status/{id})
5. TBO Service → Booking Integration (POST /bookings/hotels/search)

Run:  cd backend && python -m pytest test/test_core_flows.py -v
"""

import os
import sys
import logging

# Ensure backend is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from uuid import uuid4
from datetime import datetime, timedelta

from app.main import app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = TestClient(app)


# ============================================================================
# Helpers
# ============================================================================

def _make_agent_token() -> str:
    """Create a valid JWT for an agent user (bypasses real auth)."""
    from app.core.security import create_access_token
    agent_id = str(uuid4())
    return create_access_token(
        subject=agent_id,
        additional_claims={"role": "agent", "family_id": None},
    )


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ============================================================================
# 1. Trip Listing API
# ============================================================================

class TestTripListingAPI:
    """GET /api/v1/trips/ — List trips with pagination."""

    def test_list_trips_returns_200(self):
        """Endpoint should return 200 with a list (even if empty)."""
        resp = client.get("/api/v1/trips/", params={"limit": 5, "offset": 0})
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        logger.info("Trip listing returned %d trips", len(data))

    def test_list_trips_with_status_filter(self):
        """Endpoint should accept trip_status query param."""
        resp = client.get("/api/v1/trips/", params={"trip_status": "active"})
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_list_trips_pagination(self):
        """Pagination params should be accepted."""
        resp = client.get("/api/v1/trips/", params={"limit": 2, "offset": 0})
        assert resp.status_code == 200


# ============================================================================
# 2. Trip Deletion/Archival API
# ============================================================================

class TestTripDeletionAPI:
    """DELETE /api/v1/trips/{trip_id} — Soft-delete (archive) a trip."""

    def test_delete_nonexistent_trip_returns_404(self):
        """Deleting a trip that doesn't exist should return 404."""
        resp = client.delete("/api/v1/trips/nonexistent_trip_12345")
        assert resp.status_code == 404

    def test_delete_trip_with_real_trip(self):
        """If a trip exists, deleting it should archive it."""
        # First, list existing trips to find one
        list_resp = client.get("/api/v1/trips/", params={"trip_status": "active", "limit": 1})
        trips = list_resp.json()

        if not trips:
            pytest.skip("No active trips in DB to test deletion")

        trip_id = trips[0]["trip_id"]
        resp = client.delete(f"/api/v1/trips/{trip_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "archived"
        assert data["trip_id"] == trip_id
        logger.info("Trip %s archived successfully", trip_id)


# ============================================================================
# 3. Agent Dashboard — Real Data
# ============================================================================

class TestAgentDashboard:
    """
    GET  /api/v1/agent/itinerary/options
    POST /api/v1/agent/itinerary/approve
    """

    def test_get_options_requires_auth(self):
        """Should return 401/403 without agent token."""
        resp = client.get("/api/v1/agent/itinerary/options", params={"event_id": "test"})
        assert resp.status_code in (401, 403)

    def test_get_options_with_auth_and_missing_event(self):
        """Should return 404 for a non-existent event_id."""
        token = _make_agent_token()
        resp = client.get(
            "/api/v1/agent/itinerary/options",
            params={"event_id": "nonexistent_event_12345"},
            headers=_auth_header(token),
        )
        assert resp.status_code == 404

    def test_get_options_with_seeded_data(self):
        """
        Seed an ItineraryOptionDB record, then verify the endpoint returns it.
        """
        from app.services.itinerary_option_service import ItineraryOptionService

        event_id = f"test_evt_{uuid4().hex[:8]}"
        trip_id = f"test_trip_{uuid4().hex[:8]}"

        # Seed
        option = ItineraryOptionService.create_option(
            event_id=event_id,
            trip_id=trip_id,
            summary="Test option — integration test",
            cost=150.0,
            satisfaction=0.85,
            details={"pois": ["LOC_001", "LOC_002"]},
        )
        logger.info("Seeded itinerary option %s for event %s", option.id, event_id)

        # Query
        token = _make_agent_token()
        resp = client.get(
            "/api/v1/agent/itinerary/options",
            params={"event_id": event_id},
            headers=_auth_header(token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["options"]) >= 1
        assert data["options"][0]["summary"] == "Test option — integration test"
        assert data["options"][0]["status"] == "PENDING"

    def test_approve_option(self):
        """
        Seed an option, then approve it via the API.
        """
        from app.services.itinerary_option_service import ItineraryOptionService

        event_id = f"test_evt_{uuid4().hex[:8]}"
        trip_id = f"test_trip_{uuid4().hex[:8]}"

        option = ItineraryOptionService.create_option(
            event_id=event_id,
            trip_id=trip_id,
            summary="Approve me",
            cost=200.0,
            satisfaction=0.9,
        )

        token = _make_agent_token()
        resp = client.post(
            "/api/v1/agent/itinerary/approve",
            json={"option_id": str(option.id)},
            headers=_auth_header(token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["option_id"] == str(option.id)
        assert "approved" in data["message"].lower()

    def test_approve_requires_auth(self):
        """Approve should return 401/403 without agent token."""
        resp = client.post(
            "/api/v1/agent/itinerary/approve",
            json={"option_id": str(uuid4())},
        )
        assert resp.status_code in (401, 403)


# ============================================================================
# 4. Booking Execution Flow
# ============================================================================

class TestBookingExecutionFlow:
    """
    POST /api/v1/bookings/execute
    GET  /api/v1/bookings/status/{job_id}
    """

    def test_execute_requires_auth(self):
        """Should return 401/403 without agent token."""
        resp = client.post("/api/v1/bookings/execute", json={
            "itinerary_id": "test",
            "items": ["hotel"],
            "checkin": "2026-04-01",
            "checkout": "2026-04-03",
        })
        assert resp.status_code in (401, 403)

    @patch("app.worker.process_hotel_booking")
    def test_execute_booking_creates_job(self, mock_task):
        """
        With Celery mocked, POST /bookings/execute should create a BookingJob
        and return a job_id.
        """
        # Mock the Celery .delay() call
        mock_async = MagicMock()
        mock_async.id = "celery-task-id-123"
        mock_task.delay.return_value = mock_async

        token = _make_agent_token()
        resp = client.post(
            "/api/v1/bookings/execute",
            json={
                "itinerary_id": "test_itin_001",
                "items": ["hotel"],
                "city_code": "418069",
                "checkin": "2026-04-01",
                "checkout": "2026-04-03",
                "rooms": 1,
                "adults": 2,
                "children": 0,
                "nationality": "IN",
            },
            headers=_auth_header(token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "job_id" in data
        assert data["status"] == "pending"
        logger.info("Booking job created: %s", data["job_id"])

    def test_status_requires_auth(self):
        """Should return 401/403 without agent token."""
        resp = client.get(f"/api/v1/bookings/status/{uuid4()}")
        assert resp.status_code in (401, 403)

    def test_status_nonexistent_job_returns_404(self):
        """Querying a non-existent job should return 404."""
        token = _make_agent_token()
        resp = client.get(
            f"/api/v1/bookings/status/{uuid4()}",
            headers=_auth_header(token),
        )
        assert resp.status_code == 404


# ============================================================================
# 5. TBO Service → Booking Integration (Hotel Search)
# ============================================================================

class TestTBOHotelSearch:
    """POST /api/v1/bookings/hotels/search — Direct TBO hotel search."""

    def test_search_requires_auth(self):
        """Should return 401/403 without agent token."""
        resp = client.post("/api/v1/bookings/hotels/search", json={
            "city_code": "418069",
            "checkin": "2026-04-01",
            "checkout": "2026-04-03",
        })
        assert resp.status_code in (401, 403)

    @patch("app.api.bookings.TBOHotelClient")
    def test_search_with_mock_tbo(self, MockTBO):
        """
        With TBO mocked, search should return structured results.
        """
        # Setup mocks
        mock_client = MagicMock()
        MockTBO.return_value = mock_client
        mock_client.get_hotel_codes.return_value = [
            {"HotelCode": "H001", "HotelName": "Test Hotel"},
        ]
        mock_client.search_hotels.return_value = {
            "Status": {"Code": 200},
            "TraceId": "trace-123",
            "HotelResult": [
                {
                    "HotelCode": "H001",
                    "Currency": "INR",
                    "Rooms": [{"Name": ["Deluxe Room"], "TotalFare": 5000.0, "BookingCode": "BC123"}],
                }
            ],
        }

        token = _make_agent_token()
        resp = client.post(
            "/api/v1/bookings/hotels/search",
            json={
                "city_code": "418069",
                "checkin": "2026-04-01",
                "checkout": "2026-04-03",
                "max_hotels": 10,
            },
            headers=_auth_header(token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["hotels_found"] >= 1
        assert data["trace_id"] == "trace-123"


# ============================================================================
# Service-Level Tests
# ============================================================================

class TestTripServiceDirectly:
    """Direct service-layer tests for TripService."""

    def test_list_trips_service(self):
        from app.services.trip_service import TripService
        trips = TripService.list_trips(limit=5, offset=0)
        assert isinstance(trips, list)

    def test_delete_trip_not_found(self):
        from app.services.trip_service import TripService
        with pytest.raises(ValueError, match="Trip not found"):
            TripService.delete_trip("does_not_exist_xyz")


class TestItineraryOptionServiceDirectly:
    """Direct service-layer tests for ItineraryOptionService."""

    def test_create_and_get_option(self):
        from app.services.itinerary_option_service import ItineraryOptionService
        from app.models.itinerary_option import OptionStatus

        event_id = f"svc_test_{uuid4().hex[:8]}"
        option = ItineraryOptionService.create_option(
            event_id=event_id,
            trip_id="svc_trip_test",
            summary="Service-level test",
            cost=100.0,
            satisfaction=0.75,
        )
        assert option.id is not None
        assert option.status == OptionStatus.PENDING

        fetched = ItineraryOptionService.get_option_by_id(option.id)
        assert fetched is not None
        assert fetched.summary == "Service-level test"

    def test_approve_rejects_siblings(self):
        from app.services.itinerary_option_service import ItineraryOptionService
        from app.models.itinerary_option import OptionStatus

        event_id = f"sibling_test_{uuid4().hex[:8]}"
        agent_id = uuid4()

        opt1 = ItineraryOptionService.create_option(
            event_id=event_id, trip_id="trip_x", summary="Option A",
            cost=100, satisfaction=0.8,
        )
        opt2 = ItineraryOptionService.create_option(
            event_id=event_id, trip_id="trip_x", summary="Option B",
            cost=200, satisfaction=0.6,
        )

        # Approve opt1 — opt2 should auto-reject
        approved = ItineraryOptionService.approve_option(opt1.id, agent_id)
        assert approved.status == OptionStatus.APPROVED

        rejected = ItineraryOptionService.get_option_by_id(opt2.id)
        assert rejected.status == OptionStatus.REJECTED


class TestBookingServiceDirectly:
    """Direct service-layer tests for BookingService."""

    def test_create_and_get_job(self):
        from app.services.booking_service import BookingService
        from app.models.booking_job import JobStatus

        job = BookingService.create_job(
            itinerary_id="test_itin",
            agent_id="agent_123",
            items=["hotel"],
        )
        assert job.id is not None
        assert job.status == JobStatus.PENDING.value

        fetched = BookingService.get_job(job.id)
        assert fetched is not None

    def test_update_job_status(self):
        from app.services.booking_service import BookingService
        from app.models.booking_job import JobStatus

        job = BookingService.create_job(
            itinerary_id="test_itin_2",
            agent_id="agent_456",
            items=["hotel", "flight"],
        )

        updated = BookingService.update_job_status(
            job.id, JobStatus.PROCESSING, celery_task_id="task-abc"
        )
        assert updated.status == JobStatus.PROCESSING.value
        assert updated.celery_task_id == "task-abc"

    def test_create_hotel_booking(self):
        from app.services.booking_service import BookingService
        from app.models.hotel_booking import HotelBookingStatus

        job = BookingService.create_job(
            itinerary_id="test_itin_3",
            agent_id="agent_789",
            items=["hotel"],
        )

        hb = BookingService.create_hotel_booking(
            job_id=job.id,
            status=HotelBookingStatus.SEARCHING,
            hotel_code="H999",
            hotel_name="Grand Test Hotel",
        )
        assert hb.id is not None
        assert hb.hotel_name == "Grand Test Hotel"

        bookings = BookingService.get_hotel_bookings_for_job(job.id)
        assert len(bookings) == 1
