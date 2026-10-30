"""
Business analytics for the travel agent's desk.

Everything here is derived from rows the platform already stores: trips, itinerary versions,
itinerary options (the approval queue), agent jobs and families' saved preferences. Nothing is
estimated or invented; a metric with no data behind it comes back empty.
"""

import json
import logging
import os
import statistics
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine
from app.models.agent_job import AgentJob
from app.models.family import Family
from app.models.itinerary import Itinerary
from app.models.itinerary_option import ItineraryOptionDB, OptionStatus
from app.models.trip_session import TripSession
from app.services.itinerary_format import normalize_itinerary

logger = logging.getLogger(__name__)


def _locations() -> Dict[str, Dict[str, Any]]:
    path = os.path.join(settings.ML_DATA_DIR, "locations.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        items = data if isinstance(data, list) else data.get("locations", [])
        return {str(i.get("location_id")): i for i in items}
    except Exception as e:  # the analytics still work without the catalogue
        logger.warning(f"Could not read locations for analytics: {e}")
        return {}


def _uuid(value: Any) -> Optional[UUID]:
    try:
        return UUID(str(value))
    except (ValueError, TypeError):
        return None


def _stops(data: Optional[dict]) -> List[Dict[str, Any]]:
    if not data:
        return []
    try:
        data = normalize_itinerary(data)
    except Exception:
        return []
    out: List[Dict[str, Any]] = []
    for d in data.get("days", []):
        for p in d.get("pois", []):
            out.append({**p, "_day": d.get("day")})
    return out


def _round(value: Optional[float], digits: int = 1) -> Optional[float]:
    return None if value is None else round(value, digits)


def compute_analytics(agent_sub: Optional[str] = None) -> Dict[str, Any]:
    catalogue = _locations()
    now = datetime.utcnow()

    with Session(engine) as session:
        from app.services.agency_service import agency_of, trip_ids_in

        visible = trip_ids_in(session, agency_of(session, agent_sub)) if agent_sub else None
        trips = [t for t in session.exec(select(TripSession).order_by(TripSession.created_at)).all() if visible is None or t.trip_id in visible]
        options = [o for o in session.exec(select(ItineraryOptionDB)).all() if visible is None or o.trip_id in visible]
        jobs = [j for j in session.exec(select(AgentJob)).all() if visible is None or j.trip_id in visible]
        families = {str(f.id): f for f in session.exec(select(Family)).all()}
        itineraries = session.exec(select(Itinerary).order_by(Itinerary.family_id, Itinerary.version)).all()

        by_family: Dict[str, List[Itinerary]] = defaultdict(list)
        for it in itineraries:
            by_family[str(it.family_id)].append(it)

        trip_rows: List[Dict[str, Any]] = []
        fam_with_trips: set = set()
        stop_count: Counter = Counter()
        added: Counter = Counter()
        removed: Counter = Counter()
        category_cost: Dict[str, float] = defaultdict(float)
        category_stops: Counter = Counter()
        interest_sum: Dict[str, float] = defaultdict(float)
        interest_n = 0
        pace: Counter = Counter()
        party_sizes: Counter = Counter()
        children_total = 0
        travellers_total = 0
        feedback_by_day: Counter = Counter()
        versions_by_day: Counter = Counter()
        version_lines: List[Dict[str, Any]] = []
        by_month: Dict[str, Dict[str, float]] = defaultdict(lambda: {"trips": 0, "value": 0.0})

        for t in trips:
            fam_id = next((str(f) for f in (t.family_ids or []) if _uuid(f)), None)
            versions = by_family.get(fam_id or "", [])
            latest = versions[-1] if versions else None
            first = versions[0] if versions else None
            family = families.get(fam_id or "")
            if family:
                fam_with_trips.add(fam_id)
            prefs = (family.preferences or {}) if family else {}
            members = int(prefs.get("members", 1) or 1)
            children = int(prefs.get("children", 0) or 0)
            days = (latest.duration_days if latest and latest.duration_days else None) or (
                ((t.end_date - t.start_date).days + 1) if t.start_date and t.end_date else None
            )
            cost = latest.total_cost if latest else None
            fit = latest.total_satisfaction if latest else None

            trip_rows.append(
                {
                    "trip_id": t.trip_id,
                    "trip_name": t.trip_name,
                    "start_date": t.start_date.isoformat() if t.start_date else None,
                    "days": days,
                    "members": members,
                    "children": children,
                    "versions": len(versions),
                    "feedback": len(t.feedback_history or []),
                    "cost": cost,
                    "first_cost": first.total_cost if first else None,
                    "fit": _round(fit * 10, 1) if fit is not None else None,
                    "first_fit": _round(first.total_satisfaction * 10, 1) if first and first.total_satisfaction is not None else None,
                    "per_day": _round(cost / days, 0) if cost and days else None,
                    "per_traveller": _round(cost / members, 0) if cost and members else None,
                    "published": latest is not None,
                }
            )

            if t.start_date and cost is not None:
                key = t.start_date.strftime("%Y-%m")
                by_month[key]["trips"] += 1
                by_month[key]["value"] += cost

            if families.get(fam_id or ""):
                travellers_total += members
                children_total += children
                party_sizes[members] += 1
                pace[str(prefs.get("pace_preference", "moderate"))] += 1
                vec = prefs.get("interest_vector") or {}
                if vec:
                    interest_n += 1
                    for k, v in vec.items():
                        interest_sum[k] += float(v)

            if versions:
                version_lines.append(
                    {
                        "trip_name": t.trip_name,
                        "points": [{"version": v.version, "cost": v.total_cost, "fit": _round((v.total_satisfaction or 0) * 10, 1)} for v in versions],
                    }
                )
                for v in versions[1:]:
                    versions_by_day[v.created_at.strftime("%Y-%m-%d")] += 1

            # What the current plan schedules, and what each re-plan added or dropped
            for p in _stops(latest.data if latest else None):
                lid = str(p.get("location_id", ""))
                info = catalogue.get(lid, {})
                name = p.get("name") or info.get("name") or lid
                stop_count[(lid, name)] += 1
                cat = "Meals" if p.get("category") == "meal" else {"HARD_POI": "Landmarks", "SOFT_POI": "Other stops"}.get(str(info.get("category")), "Other stops")
                category_stops[cat] += 1
                category_cost[cat] += float(p.get("cost") or info.get("cost") or 0) * members
            for prev, nxt in zip(versions, versions[1:]):
                a = {str(p.get("location_id")): p.get("name") for p in _stops(prev.data)}
                b = {str(p.get("location_id")): p.get("name") for p in _stops(nxt.data)}
                for lid in set(b) - set(a):
                    added[(lid, b[lid] or catalogue.get(lid, {}).get("name") or lid)] += 1
                for lid in set(a) - set(b):
                    removed[(lid, a[lid] or catalogue.get(lid, {}).get("name") or lid)] += 1

            for f in t.feedback_history or []:
                if isinstance(f, dict) and f.get("timestamp"):
                    feedback_by_day[str(f["timestamp"])[:10]] += 1

        # Approval queue
        events: Dict[str, List[ItineraryOptionDB]] = defaultdict(list)
        for o in options:
            events[o.event_id].append(o)
        pending_events = [e for e, os_ in events.items() if all(o.status == OptionStatus.PENDING for o in os_)]
        accepted_events = [e for e, os_ in events.items() if any(o.status == OptionStatus.APPROVED for o in os_)]
        declined_events = [e for e, os_ in events.items() if all(o.status == OptionStatus.REJECTED for o in os_)]
        decided_hours = []
        for os_ in events.values():
            for o in os_:
                if o.status == OptionStatus.APPROVED and o.approved_at and o.created_at:
                    decided_hours.append((o.approved_at - o.created_at).total_seconds() / 3600)
        first_plans = [e for e in events if e.startswith("trip_init_")]
        decided_total = len(accepted_events) + len(declined_events)
        oldest_pending = None
        for e in pending_events:
            created = min(o.created_at for o in events[e])
            if oldest_pending is None or created < oldest_pending:
                oldest_pending = created
        approved_options = [o for o in options if o.status == OptionStatus.APPROVED]

        # Agent jobs
        job_types: Dict[str, Dict[str, Any]] = {}
        for j in jobs:
            row = job_types.setdefault(str(j.job_type.value if hasattr(j.job_type, "value") else j.job_type), {"total": 0, "completed": 0, "failed": 0, "retried": 0, "seconds": []})
            row["total"] += 1
            status = str(j.status.value if hasattr(j.status, "value") else j.status)
            if status == "COMPLETED":
                row["completed"] += 1
            if status == "FAILED":
                row["failed"] += 1
            if (j.attempt_count or 0) > 1:
                row["retried"] += 1
            if j.started_at and j.completed_at:
                row["seconds"].append((j.completed_at - j.started_at).total_seconds())
        job_rows = [
            {
                "job_type": k,
                "total": v["total"],
                "completed": v["completed"],
                "failed": v["failed"],
                "retried": v["retried"],
                "avg_seconds": _round(statistics.mean(v["seconds"]), 1) if v["seconds"] else None,
            }
            for k, v in sorted(job_types.items())
        ]

    published = [r for r in trip_rows if r["cost"] is not None]
    costs = [r["cost"] for r in published]
    fits = [r["fit"] for r in published if r["fit"] is not None]
    reoptimised = [r for r in published if r["versions"] > 1 and r["first_cost"] is not None and r["cost"] is not None]
    saved = sum(max(0.0, r["first_cost"] - r["cost"]) for r in reoptimised)
    added_cost = sum(max(0.0, r["cost"] - r["first_cost"]) for r in reoptimised)
    days_total = sum(r["days"] or 0 for r in published)

    def top(counter: Counter, n: int = 8) -> List[Dict[str, Any]]:
        return [{"location_id": k[0], "name": k[1], "count": c} for k, c in counter.most_common(n)]

    def share(count: int, total: int) -> Optional[float]:
        return _round(100 * count / total, 0) if total else None

    horizon = [(now - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(13, -1, -1)]
    return {
        "generated_at": now.isoformat(),
        "totals": {
            "trips": len(trip_rows),
            "published_trips": len(published),
            "families": len(fam_with_trips),
            "travellers": travellers_total,
            "children": children_total,
            "plan_value": _round(sum(costs), 0),
            "avg_cost": _round(statistics.mean(costs), 0) if costs else None,
            "avg_cost_per_day": _round(sum(costs) / days_total, 0) if costs and days_total else None,
            "avg_cost_per_traveller": _round(statistics.mean([r["per_traveller"] for r in published if r["per_traveller"]]), 0)
            if any(r["per_traveller"] for r in published)
            else None,
            "avg_fit": _round(statistics.mean(fits), 1) if fits else None,
            "avg_versions": _round(statistics.mean([r["versions"] for r in published]), 1) if published else None,
            "feedback_rounds": sum(r["feedback"] for r in trip_rows),
            "replanned_trips": len(reoptimised),
            "saved_by_replanning": _round(saved, 0),
            "added_by_replanning": _round(added_cost, 0),
        },
        "approvals": {
            "pending": len(pending_events),
            "accepted": len(accepted_events),
            "declined": len(declined_events),
            "first_plans": len(first_plans),
            "change_requests": len(events) - len(first_plans),
            "acceptance_rate": share(len(accepted_events), decided_total),
            "median_hours_to_decide": _round(statistics.median(decided_hours), 1) if decided_hours else None,
            "oldest_pending_hours": _round((now - oldest_pending).total_seconds() / 3600, 1) if oldest_pending else None,
            "approved_value": _round(sum(o.cost for o in approved_options), 0),
        },
        "jobs": {
            "total": sum(r["total"] for r in job_rows),
            "success_rate": share(sum(r["completed"] for r in job_rows), sum(r["total"] for r in job_rows)),
            "by_type": job_rows,
        },
        "trips": sorted(trip_rows, key=lambda r: r["start_date"] or ""),
        "by_month": [{"month": m, "trips": int(v["trips"]), "value": _round(v["value"], 0)} for m, v in sorted(by_month.items())],
        "version_lines": version_lines,
        "stops": {
            "most_scheduled": top(stop_count),
            "most_added": top(added),
            "most_dropped": top(removed),
            "by_category": [
                {"category": c, "stops": category_stops[c], "cost": _round(category_cost[c], 0)}
                for c in sorted(category_stops, key=lambda k: -category_cost[k])
            ],
        },
        "customers": {
            "party_sizes": [{"size": s, "families": n} for s, n in sorted(party_sizes.items())],
            "pace": [{"pace": p, "families": n} for p, n in pace.most_common()],
            "interests": sorted(
                [{"interest": k, "average": _round(100 * v / interest_n, 0)} for k, v in interest_sum.items()],
                key=lambda r: -(r["average"] or 0),
            )
            if interest_n
            else [],
            "children_share": share(children_total, travellers_total),
        },
        "activity": [
            {"day": d, "feedback": feedback_by_day.get(d, 0), "replans": versions_by_day.get(d, 0)} for d in horizon
        ],
    }
