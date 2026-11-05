"""
Building a trip's first plan as a background job, so the API never runs the solver inside a request.

The endpoints create a TRIP_INIT job (through the outbox) and wait for it without blocking, for up to
TRIP_INIT_WAIT_SECONDS. A fast plan comes back exactly as it always did; a slow one is answered with
202 Accepted and the job to follow. A client that sends `Prefer: respond-async` gets the 202 at once.

The trip id is chosen when the job is created and travels in its payload, so running the job twice
(after a takeover, or a repeated message) finds the trip already built and reuses it instead of making a
second one.
"""
import asyncio
import logging
import uuid
from types import SimpleNamespace
from typing import Any, Dict, List, Optional, Tuple

from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.models.agent_job import AgentJob, JobStatus, JobType
from app.services.agent_job_service import AgentJobService

logger = logging.getLogger(__name__)

TERMINAL = (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED)


def start(trip: Dict[str, Any], requested_by: Optional[str], agency_id: Optional[str], *, kind: str,
          auto_publish: bool = False, family_code: Optional[str] = None) -> AgentJob:
    """Record the request as a job and queue it, atomically. Returns at once."""
    from app.services.trip_service import TripService

    trip_id = TripService._generate_trip_id(trip["destination"], trip["start_date"])
    return AgentJobService.create_job(
        JobType.TRIP_INIT, trip_id=trip_id, publish=True,
        created_by_user_id=uuid.UUID(requested_by) if requested_by else None,
        input_payload={"trip": trip, "trip_id": trip_id, "kind": kind, "agency_id": agency_id,
                       "auto_publish": auto_publish, "family_code": family_code},
    )


async def wait(job_id: uuid.UUID, seconds: float) -> AgentJob:
    """Wait, without blocking the event loop, until the job finishes or `seconds` pass."""
    loop = asyncio.get_running_loop()
    deadline = loop.time() + max(seconds, 0)
    job = await run_in_threadpool(AgentJobService.get_job, job_id)
    while job.status not in TERMINAL and loop.time() < deadline:
        await asyncio.sleep(0.25)
        job = await run_in_threadpool(AgentJobService.get_job, job_id)
    return job


def wait_seconds(prefer_header: Optional[str]) -> float:
    return 0.0 if prefer_header and "respond-async" in prefer_header.lower() else float(settings.TRIP_INIT_WAIT_SECONDS)


def accepted(job: AgentJob) -> Dict[str, Any]:
    """The body of a 202: the plan is still being built; follow the job."""
    return {
        "job_id": str(job.id),
        "status": job.status.value if hasattr(job.status, "value") else str(job.status),
        "trip_id": (job.input_payload or {}).get("trip_id"),
        "message": "Building the plan. Follow the job for progress.",
        "poll": f"{settings.API_V1_STR}/jobs/{job.id}",
    }


# ---------------------------------------------------------------------------------------------------
# Worker side
# ---------------------------------------------------------------------------------------------------
def run(job: AgentJob) -> Tuple[Any, List[Dict[str, Any]]]:
    """Build (or find) the trip and its first plan. Returns (result, announcements) for the job's finish."""
    from sqlmodel import Session, select

    from app.core.db import engine
    from app.models.itinerary_option import ItineraryOptionDB
    from app.models.trip_session import TripSession
    from app.services import notification_service as ns
    from app.services.agency_service import set_trip_agency
    from app.services.trip_service import TripService

    p = job.input_payload or {}
    trip, trip_id = p["trip"], p["trip_id"]

    with Session(engine) as s:
        existing = s.exec(select(TripSession).where(TripSession.trip_id == trip_id)).first()
        option = s.exec(select(ItineraryOptionDB).where(ItineraryOptionDB.trip_id == trip_id)).first() if existing else None
    if existing and option:
        logger.info(f"Trip {trip_id} was already built by an earlier run of job {job.id}; reusing it")
        result = {"success": True, "trip_id": trip_id, "trip_session_id": str(existing.id), "option_id": str(option.id),
                  "event_id": option.event_id, "optimizer_ran": bool((option.details or {}).get("optimizer_ran")),
                  "message": "Trip initialized and base itinerary generated.",
                  "summary": {"families": len(trip["family_ids"]), "total_members": trip.get("num_travellers") or 0,
                              "duration_days": 0, "baseline_itinerary": "", "optimizer_ran": bool((option.details or {}).get("optimizer_ran"))}}
    else:
        try:
            result = TripService.initialize_trip_with_optimization(trip_id=trip_id, **trip)
        except ValueError as e:
            return SimpleNamespace(success=False, result=None, error=f"ValueError: {e}"), []

    if p.get("agency_id"):
        set_trip_agency(trip_id, uuid.UUID(p["agency_id"]))

    published = False
    if p.get("auto_publish"):
        published = _auto_publish(result["option_id"], p.get("family_code"))
    result["published"] = published

    if p.get("kind") == "traveller":
        note = ns.announcement("notify_agents", type="plan.published" if published else "decision.created",
                               title=f"New trip: {trip['trip_name']}",
                               body=f"{trip.get('num_travellers') or ''} travellers, {trip['start_date']} to {trip['end_date']}".strip(),
                               link=f"/app/trip/{trip_id}", data={"trip_id": trip_id, "published": published})
    else:
        note = ns.announcement("notify_agents", type="decision.created", title=f"First plan ready: {trip['trip_name']}",
                               body="Waiting for approval", link="/app/desk",
                               data={"trip_id": trip_id, "option_id": result.get("option_id")})
    return SimpleNamespace(success=True, result=result, error=None), [{"kind": "notify_agents", "payload": note}]


def _auto_publish(option_id: str, family_code: Optional[str]) -> bool:
    """The traveller's own request: approve and publish the first plan straight away."""
    from app.models.itinerary_option import OptionStatus
    from app.services.itinerary_option_service import ItineraryOptionService
    from app.services.itinerary_service import ItineraryService

    try:
        option = ItineraryOptionService.get_option_by_id(uuid.UUID(option_id))
        if option is not None and getattr(option, "status", None) == OptionStatus.APPROVED:
            return True  # an earlier run already published it
        option = ItineraryOptionService.approve_option(option_id=uuid.UUID(option_id), agent_id=None)
        details = option.details or {}
        if details.get("itinerary"):
            ItineraryService.publish_base_itinerary(
                trip_id=option.trip_id, family_ids=details.get("family_ids", [family_code] if family_code else []),
                itinerary_data=details["itinerary"],
                created_reason="First plan published automatically for the traveller's own request")
            return True
    except Exception as e:
        logger.error(f"Auto-publish failed for option {option_id}: {e}", exc_info=True)
    return False



# ---------------------------------------------------------------------------------------------------
# A traveller asks to add a place: the solver works out an "add it" option, an agent decides
# ---------------------------------------------------------------------------------------------------
def start_place_request(trip, family_id: uuid.UUID, place: Dict[str, Any], note: Optional[str], requested_by: Optional[str]) -> AgentJob:
    return AgentJobService.create_job(
        JobType.POI_PROPOSAL, trip_id=trip.trip_id, publish=True,
        created_by_user_id=uuid.UUID(requested_by) if requested_by else None,
        input_payload={"family_id": str(family_id), "place": place, "note": note, "trip_name": trip.trip_name})


def run_place_request(job: AgentJob) -> Tuple[Any, List[Dict[str, Any]]]:
    from app.services import notification_service as ns
    from app.services.poi_proposal_service import propose_place

    p = job.input_payload or {}
    place = p["place"]
    try:
        proposal = propose_place(job.trip_id, uuid.UUID(p["family_id"]), place, note=p.get("note"), event_id=f"poi_req_{job.id}")
    except ValueError as e:
        return SimpleNamespace(success=False, result=None, error=f"ValueError: {e}"), []
    note = ns.announcement("notify_agents", type="decision.created", title=f"Request: add {place['name']}",
                           body=p.get("note") or f"For {p.get('trip_name') or job.trip_id}", link="/app/desk",
                           data={"trip_id": job.trip_id, "event_id": proposal["event_id"]})
    result = {"event_id": proposal["event_id"], "place": place["name"], "optimizer_ran": proposal.get("optimizer_ran")}
    return SimpleNamespace(success=True, result=result, error=None), [{"kind": "notify_agents", "payload": note}]
