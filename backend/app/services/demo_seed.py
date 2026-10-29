"""
Demo data seeding for the public sandbox.

Builds, for each persona, everything a visitor needs to see what the agents do:
a family and traveller account, a baseline itinerary (v1) and an optimized one
(v2) after feedback, per-POI explanations, preferences, a processed feedback
event, a pending POI request with options waiting for agent approval, and agent
job history including one retry. A demo travel-agent account is created too.

The timeline endpoint still reads itinerary JSON from disk, so the same itineraries
are also written under TRIP_SESSION_STORAGE (rewritten on every run, since a
free host's disk does not survive restarts). Everything is deterministic and
idempotent: running the seed twice changes nothing.
"""
import json
import logging
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine
from app.core.security import get_password_hash
from app.models.agent_job import AgentJob, AgentJobEvent, JobStatus, JobType
from app.models.event import Event, EventStatus, EventType
from app.models.family import Family
from app.models.itinerary import Itinerary
from app.models.itinerary_explanation import ItineraryExplanation
from app.models.itinerary_option import ItineraryOptionDB, OptionStatus
from app.models.preference import Preference, PreferenceType
from app.models.trip_session import TripSession
from app.models.token_blacklist import TokenBlacklist
from app.models.user import User
from app.models.user_session import UserSession

logger = logging.getLogger(__name__)

DEMO_DOMAIN = "demo.merydian.com"
AGENT_EMAIL = f"agent@{DEMO_DOMAIN}"
REPO_ROOT = Path(__file__).resolve().parents[3]
DEMO_DIR = Path(__file__).resolve().parents[2] / "demo_data"

PERSONA_BLURBS: Dict[str, Dict[str, str]] = {
    "Family_Vacation": {"title": "Family Vacation", "description": "Two adults and two children; kids get restless, so the AI moves a museum day outdoors."},
    "Luxury_Couple": {"title": "Luxury Couple", "description": "Food and shopping first, budget no object; the AI trades monuments for fine dining."},
    "Budget_Backpacker": {"title": "Budget Backpacker", "description": "Solo traveller counting every rupee; the AI swaps paid stops for cheaper history."},
    "Elderly_Travelers": {"title": "Elderly Travellers", "description": "Low energy, slow pace; the AI lightens the heaviest days."},
    "Accessibility_Trip": {"title": "Accessibility Trip", "description": "Step-free access matters; the AI replaces stops that are hard to reach."},
}


def demo_email(persona: str) -> str:
    return f"{persona.lower()}@{DEMO_DOMAIN}"


# ---------------------------------------------------------------------------
# Scenarios: a baseline plan, one round of feedback, and the swaps the AI makes
# ---------------------------------------------------------------------------
LUNCH, DINNER = "LOC_LUNCH", "LOC_DINNER"

SCENARIOS: Dict[str, Dict[str, Any]] = {
    "Family_Vacation": {
        "days": [
            ["LOC_001", LUNCH, "LOC_003", DINNER],
            ["LOC_002", LUNCH, "LOC_005", DINNER],
            ["LOC_008", LUNCH, "LOC_014", DINNER],
            ["LOC_010", LUNCH, "LOC_017"],
        ],
        "feedback": "The kids are getting restless with museums. Can we swap in something outdoors and fun?",
        "swaps": [
            (3, "LOC_014", "LOC_019", ["INTEREST_VECTOR_DOMINANCE", "CHILD_FRIENDLY"],
             "it is outdoors with open space and interactive exhibits, which fits this family's high nature and adventure interests, while the museum means two hours indoors with two children"),
            (4, "LOC_017", "LOC_013", ["BUDGET_SAVING", "ENERGY_MATCH"],
             "it is free and relaxed, so the family can wind down on the last day and the budget absorbs the extra outdoor stop"),
        ],
        "request": ("Akshardham", "high", "We'd love to see Akshardham in the evening if there's time."),
    },
    "Luxury_Couple": {
        "days": [
            ["LOC_003", LUNCH, "LOC_009", DINNER],
            ["LOC_001", LUNCH, "LOC_017", DINNER],
            ["LOC_005", LUNCH, "LOC_012", DINNER],
            ["LOC_014", LUNCH, "LOC_011"],
        ],
        "feedback": "We'd like more time for fine dining and shopping, with fewer monuments.",
        "swaps": [
            (3, "LOC_005", "LOC_015", ["INTEREST_VECTOR_DOMINANCE", "LOW_BUDGET_SENSITIVITY"],
             "Chandni Chowk combines the shopping and food scores this couple rates highest, and budget is not a constraint for them"),
            (4, "LOC_014", "LOC_044", ["INTEREST_VECTOR_DOMINANCE", "LOW_BUDGET_SENSITIVITY"],
             "Indian Accent matches their top-rated interest, food, and replaces a museum visit they scored low on"),
        ],
        "request": ("Hauz Khas Village", "medium", "A late evening at Hauz Khas would be perfect."),
    },
    "Budget_Backpacker": {
        "days": [
            ["LOC_002", LUNCH, "LOC_008", "LOC_007"],
            ["LOC_001", LUNCH, "LOC_018", DINNER],
            ["LOC_010", LUNCH, "LOC_013", "LOC_016"],
            ["LOC_015", LUNCH, "LOC_012"],
            ["LOC_005", LUNCH, "LOC_003"],
        ],
        "feedback": "I want free or very cheap places only, and more history.",
        "swaps": [
            (3, "LOC_016", "LOC_014", ["BUDGET_SAVING", "INTEREST_VECTOR_DOMINANCE"],
             "the National Museum costs far less than the market stop and matches the traveller's top interest, history"),
            (4, "LOC_012", "LOC_020", ["BUDGET_SAVING", "INTEREST_VECTOR_DOMINANCE"],
             "the National Gallery of Modern Art is cheaper and culture is rated at the maximum in this profile"),
        ],
        "request": ("Agrasen ki Baoli", "low", "Heard this stepwell is free and great for photos."),
    },
    "Elderly_Travelers": {
        "days": [
            ["LOC_013", LUNCH, "LOC_005"],
            ["LOC_014", LUNCH, "LOC_004"],
            ["LOC_001", LUNCH, "LOC_007"],
            ["LOC_006", LUNCH],
            ["LOC_002", LUNCH, "LOC_008"],
        ],
        "feedback": "Akshardham plus a full day is too tiring. Please lighten the days and keep us seated more.",
        "swaps": [
            (4, "LOC_006", "LOC_010", ["ENERGY_MATCH", "PACE_PREFERENCE"],
             "Akshardham is a two-hour visit with long walks; Safdarjung Tomb is an hour and fits the relaxed pace and low energy level"),
            (3, "LOC_007", "LOC_020", ["ENERGY_MATCH", "ACCESSIBILITY_CONSTRAINT"],
             "an indoor gallery with seating replaces the stairs and crowds at Jama Masjid"),
        ],
        "request": ("Lodhi Gardens", "medium", "A quiet morning walk in Lodhi Gardens would be lovely."),
    },
    "Accessibility_Trip": {
        "days": [
            ["LOC_003", LUNCH, "LOC_013", DINNER],
            ["LOC_005", LUNCH, "LOC_014", DINNER],
            ["LOC_001", LUNCH, "LOC_020"],
            ["LOC_004", LUNCH, "LOC_010"],
        ],
        "feedback": "Steps and uneven ground are difficult for a wheelchair. Please prefer step-free places.",
        "swaps": [
            (3, "LOC_001", "LOC_019", ["ACCESSIBILITY_CONSTRAINT", "INTEREST_VECTOR_DOMINANCE"],
             "the Garden of Five Senses has paved, level paths, while Red Fort has long uneven approaches"),
            (4, "LOC_010", "LOC_012", ["ACCESSIBILITY_CONSTRAINT"],
             "Dilli Haat is a flat, covered market, replacing a tomb with steps at the entrance"),
        ],
        "request": ("India Gate", "high", "Could we have an extra evening at India Gate? The lawns are flat."),
    },
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _data_dir() -> Path:
    configured = Path(settings.ML_OPTIMIZER_BASE_DATA)
    if configured.is_absolute() and (configured / "locations.json").exists():
        return configured
    return REPO_ROOT / "ml_or" / "data"


def _load_locations() -> Dict[str, Dict[str, Any]]:
    with open(_data_dir() / "locations.json", "r", encoding="utf-8") as f:
        return {loc["location_id"]: loc for loc in json.load(f)}


def _poi_score(loc: Dict[str, Any], interests: Dict[str, float]) -> float:
    scores = [interests[t] for t in loc.get("tags", []) if t in interests]
    return sum(scores) / len(scores) if scores else 0.4


def _fmt_time(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def _build_itinerary(days: List[List[str]], locs: Dict[str, Dict[str, Any]],
                     members: int, interests: Dict[str, float], comment: Optional[Dict[str, str]] = None
                     ) -> Dict[str, Any]:
    """Itinerary in the optimizer-output shape read by the timeline endpoint."""
    comment = comment or {}
    out_days = []
    total_cost = 0.0
    scored: List[float] = []
    for d, poi_ids in enumerate(days, start=1):
        clock = 9 * 60
        pois = []
        for pid in poi_ids:
            loc = locs[pid]
            visit = int(loc["avg_visit_time_min"])
            # Keep meals at believable times of day
            if pid == LUNCH:
                clock = max(clock, 12 * 60 + 30)
            elif pid == DINNER:
                clock = max(clock, 19 * 60)
            pois.append({
                "location_id": pid,
                "poi_id": pid,
                "name": loc["name"],
                "category": "meal" if loc.get("type") == "RESTAURANT" else "activity",
                "role": loc.get("role") or ("UTILITY" if loc.get("category") == "UTILITY_POI" else "OPTIONAL"),
                "time_window_start": _fmt_time(clock),
                "time_window_end": _fmt_time(clock + visit),
                "planned_visit_time_min": visit,
                "comment": comment.get(f"{d}:{pid}"),
            })
            total_cost += float(loc["cost"]) * members
            if loc.get("type") == "POI":
                scored.append(_poi_score(loc, interests))
            clock += visit + 30
        out_days.append({"day": d, "pois": pois})
    satisfaction = round(10 * (sum(scored) / len(scored)), 2) if scored else 0.0
    return {"days": out_days, "total_cost": round(total_cost, 2), "total_satisfaction": satisfaction}


def _apply_swaps(days: List[List[str]], swaps: List[Tuple]) -> List[List[str]]:
    new_days = [list(d) for d in days]
    for day, old, new, _tags, _why in swaps:
        new_days[day - 1] = [new if p == old else p for p in new_days[day - 1]]
    return new_days


def _write_session_files(trip_id: str, baseline: Dict[str, Any], latest: Dict[str, Any]) -> Tuple[str, str]:
    base = Path(settings.TRIP_SESSION_STORAGE)
    if not base.is_absolute():
        base = Path.cwd() / base
    folder = base / trip_id
    folder.mkdir(parents=True, exist_ok=True)
    baseline_path = folder / "baseline_itinerary.json"
    latest_path = folder / "latest_itinerary.json"
    baseline_path.write_text(json.dumps(baseline, indent=2), encoding="utf-8")
    latest_path.write_text(json.dumps(latest, indent=2), encoding="utf-8")
    return str(baseline_path), str(latest_path)


def _password_hash() -> str:
    return get_password_hash(settings.DEMO_PASSWORD or secrets.token_urlsafe(24))


# ---------------------------------------------------------------------------
# Seeding
# ---------------------------------------------------------------------------
def _ensure_agent(session: Session) -> User:
    agent = session.exec(select(User).where(User.email == AGENT_EMAIL)).first()
    if not agent:
        agent = User(email=AGENT_EMAIL, hashed_password=_password_hash(), role="agent",
                     full_name="Demo Travel Agent", is_active=True)
        session.add(agent)
        session.flush()
        logger.info("Created demo travel agent")
    return agent


def _job(job_type: JobType, status: JobStatus, trip_id: str, user_id, itinerary_id: Optional[str],
         started: datetime, result: Dict[str, Any], attempts: int = 1) -> Tuple[AgentJob, List[AgentJobEvent]]:
    created = started - timedelta(seconds=4)
    finished = started + timedelta(seconds=38 if attempts == 1 else 96)
    job = AgentJob(
        job_type=job_type, status=status, trip_id=trip_id, itinerary_id=itinerary_id,
        created_by_user_id=user_id, attempt_count=attempts, worker_id="worker@render",
        input_payload={"trip_id": trip_id}, result_payload=result,
        created_at=created, updated_at=finished, started_at=started, completed_at=finished,
    )
    events = [
        AgentJobEvent(job_id=job.id, event_type="STATUS_CHANGED", previous_status="CREATED",
                      new_status="QUEUED", event_payload={}, timestamp=created),
        AgentJobEvent(job_id=job.id, event_type="STATUS_CHANGED", previous_status="QUEUED",
                      new_status="RUNNING", event_payload={"worker": "worker@render"}, timestamp=started),
    ]
    if attempts > 1:
        events += [
            AgentJobEvent(job_id=job.id, event_type="RETRY_SCHEDULED", previous_status="RUNNING",
                          new_status="RETRYING",
                          event_payload={"reason": "LLM provider timeout", "countdown_seconds": 2},
                          timestamp=started + timedelta(seconds=30)),
            AgentJobEvent(job_id=job.id, event_type="STATUS_CHANGED", previous_status="RETRYING",
                          new_status="RUNNING", event_payload={"attempt": attempts},
                          timestamp=started + timedelta(seconds=34)),
        ]
    events.append(AgentJobEvent(job_id=job.id, event_type="STATUS_CHANGED", previous_status="RUNNING",
                                new_status=status.value, event_payload={}, timestamp=finished))
    return job, events


def _seed_persona(session: Session, persona: str, config: Dict[str, Any], agent: User,
                  locs: Dict[str, Dict[str, Any]]) -> bool:
    scenario = SCENARIOS[persona]
    with open(DEMO_DIR / f"{persona}_trip.json", "r", encoding="utf-8") as f:
        fixture = json.load(f)
    trip_id = fixture["trip_id"]

    fam_cfg = config["families"][0]
    interests = fam_cfg["interest_vector"]
    members = int(fam_cfg["members"])
    swaps = scenario["swaps"]

    v1_days = scenario["days"]
    v2_days = _apply_swaps(v1_days, swaps)
    why = {f"{d}:{new}": f"Added: {reason}" for d, _o, new, _t, reason in swaps}
    v1 = _build_itinerary(v1_days, locs, members, interests)
    v2 = _build_itinerary(v2_days, locs, members, interests, why)

    baseline_path, latest_path = _write_session_files(trip_id, v1, v2)

    if session.exec(select(TripSession).where(TripSession.trip_id == trip_id)).first():
        logger.info("Skipping %s: trip %s already seeded (files refreshed)", persona, trip_id)
        return False

    now = datetime.utcnow()
    start, end = datetime.fromisoformat(config["start_date"]), datetime.fromisoformat(config["end_date"])

    # Family and traveller
    family = Family(
        family_code=fam_cfg["family_id"], family_name=f"{persona.replace('_', ' ')} Family",
        trip_name=config["trip_name"], destination=config["destination"],
        start_date=start, end_date=end, preferences=fam_cfg, is_active=True,
    )
    session.add(family)
    session.flush()
    traveller = User(email=demo_email(persona), hashed_password=_password_hash(), role="traveller",
                     full_name=persona.replace("_", " "), family_id=family.id, is_active=True)
    session.add(traveller)
    session.flush()

    # Itinerary versions
    created1, created2 = now - timedelta(hours=26), now - timedelta(hours=3)
    it1 = Itinerary(family_id=family.id, version=1, data=v1, created_reason="Baseline generated by optimizer",
                    created_by="system", total_cost=v1["total_cost"], total_satisfaction=v1["total_satisfaction"],
                    duration_days=len(v1_days), created_at=created1)
    it2 = Itinerary(family_id=family.id, version=2, data=v2, created_reason="Re-optimized after traveller feedback",
                    created_by="system", total_cost=v2["total_cost"], total_satisfaction=v2["total_satisfaction"],
                    duration_days=len(v2_days), created_at=created2)
    session.add(it1)
    session.add(it2)
    session.flush()
    family.current_itinerary_version = it2.id
    session.add(family)

    # Trip session: family_ids lists the family code (used by the optimizer pipeline) and the UUID (used by access checks)
    initial_prefs = {fam_cfg["family_id"]: fam_cfg}
    current_prefs = {fam_cfg["family_id"]: {
        **fam_cfg,
        "never_visit_locations": [old for _d, old, *_ in swaps],
        "must_visit_locations": sorted(set(fam_cfg.get("must_visit_locations", [])) | {new for _d, _o, new, *_ in swaps}),
    }}
    session.add(TripSession(
        trip_id=trip_id, trip_name=config["trip_name"], destination=config["destination"],
        start_date=start, end_date=end, family_ids=[family.family_code, str(family.id)], current_itinerary_id=it2.id,
        baseline_itinerary_path=baseline_path, latest_itinerary_path=latest_path,
        iteration_count=2, last_optimization_at=created2, initial_preferences=initial_prefs,
        current_preferences=current_prefs,
        feedback_history=[{"iteration": 1, "timestamp": created2.isoformat(), "family_id": fam_cfg["family_id"],
                           "message": scenario["feedback"], "event_type": "FEEDBACK", "action": "re-optimized"}],
        preference_history=[{"timestamp": created2.isoformat(), "iteration": 1, "family_id": fam_cfg["family_id"],
                             "change_type": "SWAP", "poi_id": new, "old_value": old, "new_value": new,
                             "trigger": "feedback"} for _d, old, new, *_ in swaps],
        status="active", created_at=created1, updated_at=created2,
    ))

    # Feedback event (processed)
    fb_event = Event(
        event_type=EventType.FEEDBACK, entity_type="family", entity_id=fam_cfg["family_id"],
        payload={"message": scenario["feedback"], "trip_id": trip_id}, status=EventStatus.COMPLETED,
        processing_result={"itinerary_version": 2, "changes": len(swaps) * 2},
        source="ui", user_id=traveller.id, family_id=family.id,
        created_at=created2 - timedelta(minutes=2), processed_at=created2,
    )
    session.add(fb_event)
    session.flush()

    # Preferences derived from the feedback
    for pid in fam_cfg.get("must_visit_locations", []):
        session.add(Preference(family_id=family.id, poi_id=pid, poi_name=locs[pid]["name"],
                               preference_type=PreferenceType.MUST_VISIT, strength=1.0,
                               reason="Stated at trip setup", created_by="system", source="setup"))
    for _d, old, new, _tags, reason in swaps:
        session.add(Preference(family_id=family.id, poi_id=old, poi_name=locs[old]["name"],
                               preference_type=PreferenceType.AVOID_VISIT, strength=0.8,
                               reason=f"Feedback: {scenario['feedback']}", created_by="system",
                               source="feedback", event_id=fb_event.id))
        session.add(Preference(family_id=family.id, poi_id=new, poi_name=locs[new]["name"],
                               preference_type=PreferenceType.PREFER_VISIT, strength=0.7,
                               reason=reason, created_by="system", source="feedback", event_id=fb_event.id))

    # Explanations (one removed + one added row per swap)
    for day, old, new, tags, reason in swaps:
        # Each row carries its own side of the swap, so the two rows net out to the plan change
        removed_cost = round(float(locs[old]["cost"]) * members, 2)
        added_cost = round(float(locs[new]["cost"]) * members, 2)
        removed_score = round(_poi_score(locs[old], interests), 2)
        added_score = round(_poi_score(locs[new], interests), 2)
        common = dict(trip_id=trip_id, family_id=family.id, itinerary_id=it2.id, prev_itinerary_id=it1.id,
                      day_number=day, causal_tags=tags, trigger_message=scenario["feedback"],
                      raw_payload={"seeded": True}, created_at=created2)
        session.add(ItineraryExplanation(
            poi_id=old, poi_name=locs[old]["name"], change_type="POI_REMOVED",
            cost_delta={"extra_cost": -removed_cost, "currency": "INR"}, satisfaction_delta={"gain": -removed_score},
            llm_explanation=f"Removed {locs[old]['name']} on day {day} to make room for {locs[new]['name']}: {reason}.",
            **common))
        session.add(ItineraryExplanation(
            poi_id=new, poi_name=locs[new]["name"], change_type="POI_ADDED",
            cost_delta={"extra_cost": added_cost, "currency": "INR"}, satisfaction_delta={"gain": added_score},
            llm_explanation=f"Added {locs[new]['name']} on day {day} because {reason}.",
            **common))

    # Agent jobs: the processed feedback (done, with history), approval tools, comms with one retry
    approved_option_event = fb_event
    pending_name, pending_urgency, pending_msg = scenario["request"]
    req_event = Event(
        event_type=EventType.POI_REQUEST, entity_type="poi", entity_id=pending_name,
        payload={"poi_name": pending_name, "urgency": pending_urgency, "message": pending_msg, "trip_id": trip_id},
        status=EventStatus.PROCESSING, source="ui", user_id=traveller.id, family_id=family.id,
        created_at=now - timedelta(minutes=25),
    )
    session.add(req_event)
    session.flush()

    # Options for the processed feedback (one approved) and for the pending request (awaiting an agent)
    changed = [new for _d, _o, new, *_ in swaps]
    session.add(ItineraryOptionDB(
        event_id=str(approved_option_event.id), trip_id=trip_id, agent_id=agent.id,
        summary=f"Apply the requested swaps ({len(swaps)} stops changed)", cost=v2["total_cost"],
        satisfaction=min(1.0, round(v2["total_satisfaction"] / 10, 2)),
        details={"affected_pois": changed, "schedule_changes": [
            {"day": d, "action": "swap", "remove": o, "add": n} for d, o, n, *_ in swaps]},
        status=OptionStatus.APPROVED, approved_by=agent.id, approved_at=created2 + timedelta(minutes=5),
        created_at=created2))

    base_cost, base_sat = v2["total_cost"], v2["total_satisfaction"]
    session.add(ItineraryOptionDB(
        event_id=str(req_event.id), trip_id=trip_id,
        summary=f"Add {pending_name} as an evening stop on day 2", cost=round(base_cost * 1.08, 2),
        satisfaction=min(1.0, round(base_sat / 10 + 0.04, 2)),
        details={"affected_pois": [pending_name], "schedule_changes": [
            {"day": 2, "action": "add_evening", "poi_name": pending_name}], "trigger": "POI_REQUEST"},
        status=OptionStatus.PENDING, created_at=now - timedelta(minutes=20)))
    session.add(ItineraryOptionDB(
        event_id=str(req_event.id), trip_id=trip_id,
        summary="Decline for now, keep the current plan (v2)", cost=base_cost,
        satisfaction=min(1.0, round(base_sat / 10, 2)),
        details={"affected_pois": [], "schedule_changes": [], "trigger": "POI_REQUEST"},
        status=OptionStatus.PENDING, created_at=now - timedelta(minutes=20)))

    jobs = [
        _job(JobType.AGENT_FEEDBACK, JobStatus.COMPLETED, trip_id, traveller.id, str(it2.id),
             created2 - timedelta(minutes=1),
             {"summary": f"Processed feedback and produced itinerary v2 with {len(swaps)} swaps",
              "event_id": str(fb_event.id), "itinerary_version": 2, "swaps": len(swaps)}),
        _job(JobType.AGENT_TOOLS, JobStatus.COMPLETED, trip_id, agent.id, str(it2.id),
             created2 + timedelta(minutes=6),
             {"summary": "Option approved; itinerary published to the traveller timeline",
              "event_id": str(fb_event.id)}),
        _job(JobType.AGENT_COMMUNICATION, JobStatus.COMPLETED, trip_id, agent.id, str(it2.id),
             created2 + timedelta(minutes=7),
             {"summary": "Traveller notified of the approved itinerary (succeeded after one retry)"}, attempts=2),
        _job(JobType.AGENT_FEEDBACK, JobStatus.COMPLETED, trip_id, traveller.id, str(it2.id),
             now - timedelta(minutes=24),
             {"summary": f"Generated 2 options for the request to add {pending_name}; awaiting agent approval",
              "awaiting_approval": True, "event_id": str(req_event.id), "options": 2}),
    ]
    for job, events in jobs:
        session.add(job)
        session.flush()
        for ev in events:
            ev.job_id = job.id
            session.add(ev)

    logger.info("Seeded %s (trip %s)", persona, trip_id)
    return True


def seed_all() -> int:
    """Seed every persona. Returns the number of newly created trips."""
    from scripts.generate_demo_data import PERSONAS

    locs = _load_locations()
    created = 0
    with Session(engine) as session:
        agent = _ensure_agent(session)
        for persona, config in PERSONAS.items():
            if persona not in SCENARIOS or not (DEMO_DIR / f"{persona}_trip.json").exists():
                logger.warning("Skipping persona %s: no scenario or fixture", persona)
                continue
            created += int(_seed_persona(session, persona, config, agent, locs))
        session.commit()
    return created


def reset_all() -> None:
    """Delete every demo account and its data (identified by the demo email domain)."""
    from sqlalchemy import delete

    with Session(engine) as session:
        users = session.exec(select(User).where(User.email.like(f"%@{DEMO_DOMAIN}"))).all()
        user_ids = [u.id for u in users]
        family_ids = [u.family_id for u in users if u.family_id]
        trips = [t for t in session.exec(select(TripSession)).all()
                 if any(str(fid) in (t.family_ids or []) for fid in family_ids)]
        trip_ids = [t.trip_id for t in trips]

        if trip_ids:
            job_ids = [j.id for j in session.exec(select(AgentJob).where(AgentJob.trip_id.in_(trip_ids))).all()]
            if job_ids:
                session.exec(delete(AgentJobEvent).where(AgentJobEvent.job_id.in_(job_ids)))
                session.exec(delete(AgentJob).where(AgentJob.id.in_(job_ids)))
            session.exec(delete(ItineraryOptionDB).where(ItineraryOptionDB.trip_id.in_(trip_ids)))
            session.exec(delete(ItineraryExplanation).where(ItineraryExplanation.trip_id.in_(trip_ids)))
        # Trip sessions and families point at itineraries, so release those first
        for t in trips:
            session.delete(t)
        for fam in session.exec(select(Family).where(Family.id.in_(family_ids))).all() if family_ids else []:
            fam.current_itinerary_version = None
            session.add(fam)
        session.flush()
        if family_ids:
            session.exec(delete(Preference).where(Preference.family_id.in_(family_ids)))
            session.exec(delete(Event).where(Event.family_id.in_(family_ids)))
            session.exec(delete(Itinerary).where(Itinerary.family_id.in_(family_ids)))
        if user_ids:
            # Sessions and blacklisted tokens accumulate as visitors enter the demo
            session.exec(delete(UserSession).where(UserSession.user_id.in_(user_ids)))
            session.exec(delete(TokenBlacklist).where(TokenBlacklist.user_id.in_(user_ids)))
            # Jobs visitors started (feedback, approvals) hold job events of their own
            leftover = [j.id for j in session.exec(
                select(AgentJob).where(AgentJob.created_by_user_id.in_(user_ids))).all()]
            if leftover:
                session.exec(delete(AgentJobEvent).where(AgentJobEvent.job_id.in_(leftover)))
                session.exec(delete(AgentJob).where(AgentJob.id.in_(leftover)))
        if family_ids:
            session.exec(delete(Family).where(Family.id.in_(family_ids)))
        for u in users:
            session.delete(u)
        session.commit()
