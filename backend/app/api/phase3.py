"""
Notifications (with a live stream), outbound webhooks, the booking ledger and the AI agent roster.
"""

import asyncio
import json
import os
import logging
import secrets
import statistics
from datetime import datetime
from typing import Annotated, Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlmodel import Session, col, func, select

from app.core.auth import TokenManager
from app.core.config import settings
from app.core.db import engine
from app.core.dependencies import get_current_agent, get_current_user, verify_trip_access
from app.models.agent_job import AgentJob
from app.models.phase3 import Notification, TripBooking, WebhookDelivery, WebhookEndpoint
from app.schemas.auth import TokenPayload
from app.services import notification_service as ns

logger = logging.getLogger(__name__)
router = APIRouter()


# ======================================================================
# Notifications
# ======================================================================

class NotificationDTO(BaseModel):
    id: int
    type: str
    title: str
    body: str
    link: Optional[str] = None
    created_at: str
    read: bool


def _dto(n: Notification) -> NotificationDTO:
    return NotificationDTO(id=n.id, type=n.type, title=n.title, body=n.body, link=n.link, created_at=n.created_at.isoformat(), read=n.read_at is not None)


@router.get("/notifications")
async def list_notifications(limit: int = Query(30, ge=1, le=100), user: TokenPayload = Depends(get_current_user)) -> Any:
    uid = UUID(user.sub)
    with Session(engine) as session:
        rows = session.exec(select(Notification).where(Notification.user_id == uid).order_by(col(Notification.id).desc()).limit(limit)).all()
        unread = session.exec(select(func.count()).select_from(Notification).where(Notification.user_id == uid, Notification.read_at == None)).one()  # noqa: E711
        return {"notifications": [_dto(n) for n in rows], "unread": int(unread)}


@router.post("/notifications/read")
async def mark_read(ids: Optional[List[int]] = None, user: TokenPayload = Depends(get_current_user)) -> Any:
    uid = UUID(user.sub)
    with Session(engine) as session:
        stmt = select(Notification).where(Notification.user_id == uid, Notification.read_at == None)  # noqa: E711
        if ids:
            stmt = stmt.where(col(Notification.id).in_(ids))
        now = datetime.utcnow()
        rows = session.exec(stmt).all()
        for n in rows:
            n.read_at = now
            session.add(n)
        session.commit()
        return {"marked": len(rows)}


@router.get("/notifications/stream")
async def notification_stream(token: str = Query(...), after: int = Query(0, ge=0)) -> StreamingResponse:
    """
    Server-sent events. EventSource cannot set headers, so the access token travels in the query string.
    New rows for the user are pushed as they appear; a comment line every 15 seconds keeps proxies open.
    """
    payload = TokenManager.verify_token(token, token_type="access")
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    uid = UUID(payload["sub"])

    async def events():
        last = after
        if last == 0:
            with Session(engine) as session:
                top = session.exec(select(func.max(Notification.id)).where(Notification.user_id == uid)).one()
                last = int(top or 0)
        idle = 0
        yield "retry: 3000\n\n"
        wake = None
        try:
            import redis.asyncio as aioredis

            client = aioredis.from_url(settings.REDIS_URL)
            wake = client.pubsub()
            await wake.subscribe(f"notif:{uid}")
        except Exception as e:
            logger.warning(f"Stream falls back to polling: {e}")
            wake = None
        while True:
            rows: List[Notification] = []
            try:
                with Session(engine) as session:
                    rows = list(session.exec(select(Notification).where(Notification.user_id == uid, Notification.id > last).order_by(Notification.id).limit(20)).all())
            except Exception as e:
                logger.error(f"Notification stream read failed: {e}")
            for n in rows:
                last = n.id
                yield f"id: {n.id}\nevent: notification\ndata: {_dto(n).model_dump_json()}\n\n"
                idle = 0
            idle += 1
            if wake is not None or idle % 7 == 0:
                yield ": keep-alive\n\n"
            if wake is not None:
                # Instant when something is published; the 15 second timeout is only a safety net
                try:
                    await wake.get_message(ignore_subscribe_messages=True, timeout=15)
                except Exception:
                    wake = None
            else:
                await asyncio.sleep(2)

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ======================================================================
# Webhooks (agents)
# ======================================================================

class WebhookIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    url: str = Field(..., max_length=500)
    format: str = Field(default="json", pattern="^(json|slack|discord)$")
    events: List[str] = Field(default_factory=list)
    active: bool = True


class WebhookPatch(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    url: Optional[str] = Field(default=None, max_length=500)
    format: Optional[str] = Field(default=None, pattern="^(json|slack|discord)$")
    events: Optional[List[str]] = None
    active: Optional[bool] = None


def _endpoint_dict(e: WebhookEndpoint, secret: bool = False) -> Dict[str, Any]:
    out = {
        "id": str(e.id),
        "name": e.name,
        "url": e.url,
        "format": e.format,
        "events": e.events or [],
        "active": e.active,
        "last_status": e.last_status,
        "last_delivery_at": e.last_delivery_at.isoformat() if e.last_delivery_at else None,
        "created_at": e.created_at.isoformat(),
        "secret_hint": e.secret[-4:],
    }
    if secret:
        out["secret"] = e.secret
    return out


def _validate_events(events: List[str]) -> None:
    unknown = [x for x in events if x not in ns.EVENTS]
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unknown events: {', '.join(unknown)}")


@router.get("/agent/webhooks")
async def list_webhooks(agent: TokenPayload = Depends(get_current_agent)) -> Any:
    with Session(engine) as session:
        rows = session.exec(select(WebhookEndpoint).where(WebhookEndpoint.owner_id == UUID(agent.sub)).order_by(WebhookEndpoint.created_at)).all()
        return {"endpoints": [_endpoint_dict(e) for e in rows], "events": [{"name": k, "description": v} for k, v in ns.EVENTS.items()]}


@router.post("/agent/webhooks", status_code=201)
async def create_webhook(body: WebhookIn, agent: TokenPayload = Depends(get_current_agent)) -> Any:
    _validate_events(body.events)
    reason = ns.url_is_allowed(body.url)
    if reason:
        raise HTTPException(status_code=400, detail=reason)
    with Session(engine) as session:
        count = session.exec(select(func.count()).select_from(WebhookEndpoint).where(WebhookEndpoint.owner_id == UUID(agent.sub))).one()
        if count >= 10:
            raise HTTPException(status_code=400, detail="You can have up to 10 webhook endpoints")
        ep = WebhookEndpoint(owner_id=UUID(agent.sub), name=body.name.strip(), url=body.url.strip(), format=body.format, events=body.events, active=body.active, secret="whsec_" + secrets.token_urlsafe(24))
        session.add(ep)
        session.commit()
        session.refresh(ep)
        return _endpoint_dict(ep, secret=True)  # the secret is shown once, here


def _own(session: Session, endpoint_id: UUID, agent: TokenPayload) -> WebhookEndpoint:
    ep = session.get(WebhookEndpoint, endpoint_id)
    if not ep or str(ep.owner_id) != agent.sub:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return ep


@router.patch("/agent/webhooks/{endpoint_id}")
async def update_webhook(endpoint_id: UUID, body: WebhookPatch, agent: TokenPayload = Depends(get_current_agent)) -> Any:
    with Session(engine) as session:
        ep = _own(session, endpoint_id, agent)
        changes = body.model_dump(exclude_none=True)
        if "events" in changes:
            _validate_events(changes["events"])
        if "url" in changes:
            reason = ns.url_is_allowed(changes["url"])
            if reason:
                raise HTTPException(status_code=400, detail=reason)
        for k, v in changes.items():
            setattr(ep, k, v)
        session.add(ep)
        session.commit()
        session.refresh(ep)
        return _endpoint_dict(ep)


@router.delete("/agent/webhooks/{endpoint_id}")
async def delete_webhook(endpoint_id: UUID, agent: TokenPayload = Depends(get_current_agent)) -> Any:
    with Session(engine) as session:
        ep = _own(session, endpoint_id, agent)
        for d in session.exec(select(WebhookDelivery).where(WebhookDelivery.endpoint_id == ep.id)).all():
            session.delete(d)
        session.delete(ep)
        session.commit()
        return {"deleted": True}


@router.post("/agent/webhooks/{endpoint_id}/test")
async def test_webhook(endpoint_id: UUID, agent: TokenPayload = Depends(get_current_agent)) -> Any:
    with Session(engine) as session:
        _own(session, endpoint_id, agent)
    row = await asyncio.to_thread(ns.deliver, endpoint_id, "webhook.test", "Test event from Merydian", "If you can read this, your endpoint works.", "/app/webhooks", {"test": True})
    return {"ok": row.ok, "status_code": row.status_code, "error": row.error, "attempts": row.attempts, "duration_ms": row.duration_ms}


@router.get("/agent/webhooks/{endpoint_id}/deliveries")
async def webhook_deliveries(endpoint_id: UUID, agent: TokenPayload = Depends(get_current_agent)) -> Any:
    with Session(engine) as session:
        _own(session, endpoint_id, agent)
        rows = session.exec(select(WebhookDelivery).where(WebhookDelivery.endpoint_id == endpoint_id).order_by(col(WebhookDelivery.created_at).desc()).limit(30)).all()
        return {
            "deliveries": [
                {"id": str(d.id), "event": d.event_type, "ok": d.ok, "status_code": d.status_code, "error": d.error, "attempts": d.attempts, "duration_ms": d.duration_ms, "created_at": d.created_at.isoformat()}
                for d in rows
            ]
        }


# ======================================================================
# Booking ledger
# ======================================================================

KINDS = "^(hotel|flight|transport|activity|other)$"
STATUSES = "^(requested|confirmed|cancelled)$"


class BookingIn(BaseModel):
    trip_id: str
    kind: str = Field(..., pattern=KINDS)
    title: str = Field(..., min_length=2, max_length=200)
    supplier: Optional[str] = Field(default=None, max_length=120)
    reference: Optional[str] = Field(default=None, max_length=80)
    amount: float = Field(default=0.0, ge=0)
    status: str = Field(default="requested", pattern=STATUSES)
    starts_on: Optional[datetime] = None
    ends_on: Optional[datetime] = None
    notes: Optional[str] = Field(default=None, max_length=500)


class BookingPatch(BaseModel):
    kind: Optional[str] = Field(default=None, pattern=KINDS)
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    supplier: Optional[str] = Field(default=None, max_length=120)
    reference: Optional[str] = Field(default=None, max_length=80)
    amount: Optional[float] = Field(default=None, ge=0)
    status: Optional[str] = Field(default=None, pattern=STATUSES)
    starts_on: Optional[datetime] = None
    ends_on: Optional[datetime] = None
    notes: Optional[str] = Field(default=None, max_length=500)


def _booking(b: TripBooking, trip_name: Optional[str] = None) -> Dict[str, Any]:
    return {
        "id": str(b.id),
        "trip_id": b.trip_id,
        "trip_name": trip_name,
        "kind": b.kind,
        "title": b.title,
        "supplier": b.supplier,
        "reference": b.reference,
        "amount": b.amount,
        "currency": b.currency,
        "status": b.status,
        "starts_on": b.starts_on.isoformat() if b.starts_on else None,
        "ends_on": b.ends_on.isoformat() if b.ends_on else None,
        "notes": b.notes,
        "created_at": b.created_at.isoformat(),
        "updated_at": b.updated_at.isoformat(),
    }


def _trip_names(agent_sub: Optional[str] = None) -> Dict[str, str]:
    """Trip names, limited to the agent's agency when one is given."""
    from app.models.trip_session import TripSession
    from app.services.agency_service import agency_of, trip_ids_in

    with Session(engine) as session:
        visible = trip_ids_in(session, agency_of(session, agent_sub)) if agent_sub else None
        return {t.trip_id: t.trip_name for t in session.exec(select(TripSession)).all() if visible is None or t.trip_id in visible}


@router.get("/agent/bookings")
async def list_all_bookings(status: Optional[str] = None, agent: TokenPayload = Depends(get_current_agent)) -> Any:
    names = _trip_names(agent.sub)
    with Session(engine) as session:
        stmt = select(TripBooking).order_by(col(TripBooking.created_at).desc())
        if status:
            stmt = stmt.where(TripBooking.status == status)
        rows = [b for b in session.exec(stmt).all() if b.trip_id in names]
        confirmed = sum(b.amount for b in rows if b.status == "confirmed")
        pending = sum(b.amount for b in rows if b.status == "requested")
        return {
            "bookings": [_booking(b, names.get(b.trip_id)) for b in rows],
            "totals": {"confirmed": confirmed, "requested": pending, "count": len(rows)},
        }


@router.get("/trips/{trip_id}/bookings")
async def trip_bookings(trip_id: str, user: TokenPayload = Depends(get_current_user), _: Any = Depends(verify_trip_access)) -> Any:
    with Session(engine) as session:
        stmt = select(TripBooking).where(TripBooking.trip_id == trip_id).order_by(TripBooking.starts_on, TripBooking.created_at)
        rows = session.exec(stmt).all()
        return {"bookings": [_booking(b) for b in rows]}


@router.post("/agent/bookings", status_code=201)
async def create_booking(body: BookingIn, agent: TokenPayload = Depends(get_current_agent)) -> Any:
    from app.services.agency_service import ensure_trip_visible
    from app.services.trip_service import TripService

    ensure_trip_visible(agent.sub, body.trip_id)
    trip = TripService.get_trip(body.trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    with Session(engine) as session:
        b = TripBooking(**body.model_dump(), created_by=UUID(agent.sub))
        session.add(b)
        session.commit()
        session.refresh(b)
        out = _booking(b, trip.trip_name)
    title = f"{body.kind.title()} {body.status}: {body.title}"
    ns.notify_trip_travellers(body.trip_id, "booking.created", title, body.supplier or "", f"/app/trip/{body.trip_id}/bookings", {"booking_id": out["id"]})
    ns.notify_agents("booking.created", title, f"{trip.trip_name}", f"/app/trip/{body.trip_id}/bookings", {"booking_id": out["id"], "trip_id": body.trip_id})
    return out


@router.patch("/agent/bookings/{booking_id}")
async def update_booking(booking_id: UUID, body: BookingPatch, agent: TokenPayload = Depends(get_current_agent)) -> Any:
    with Session(engine) as session:
        b = session.get(TripBooking, booking_id)
        if not b:
            raise HTTPException(status_code=404, detail="Booking not found")
        before = b.status
        for k, v in body.model_dump(exclude_none=True).items():
            setattr(b, k, v)
        b.updated_at = datetime.utcnow()
        session.add(b)
        session.commit()
        session.refresh(b)
        out = _booking(b)
    if out["status"] != before:
        title = f"Booking {out['status']}: {out['title']}"
        ns.notify_trip_travellers(out["trip_id"], "booking.updated", title, out.get("supplier") or "", f"/app/trip/{out['trip_id']}/bookings", {"booking_id": out["id"]})
        ns.notify_agents("booking.updated", title, "", f"/app/trip/{out['trip_id']}/bookings", {"booking_id": out["id"], "trip_id": out["trip_id"]})
    return out


@router.delete("/agent/bookings/{booking_id}")
async def delete_booking(booking_id: UUID, agent: TokenPayload = Depends(get_current_agent)) -> Any:
    with Session(engine) as session:
        b = session.get(TripBooking, booking_id)
        if not b:
            raise HTTPException(status_code=404, detail="Booking not found")
        session.delete(b)
        session.commit()
        return {"deleted": True}


# ======================================================================
# The AI agents
# ======================================================================

AGENTS = [
    {
        "id": "AGENT_FEEDBACK",
        "name": "Feedback agent",
        "does": "Reads a traveller's message, turns it into constraints, decides whether the optimizer must run and re-plans the days.",
        "uses": f"Groq {os.getenv('GROQ_MODEL', 'openai/gpt-oss-20b')} and the OR-Tools optimizer",
    },
    {
        "id": "AGENT_TOOLS",
        "name": "Tools agent",
        "does": "After an approval, prepares the bookable parts of the plan (hotels, transport and tickets).",
        "uses": "Supplier tools; records a job per approved option",
    },
    {
        "id": "AGENT_COMMUNICATION",
        "name": "Communication agent",
        "does": "After an approval, writes the update that goes to the traveller.",
        "uses": "Notifications and the traveller timeline",
    },
]


@router.get("/agent/agents")
async def agents_overview(agent: TokenPayload = Depends(get_current_agent)) -> Any:
    names = _trip_names(agent.sub)
    with Session(engine) as session:
        jobs = [j for j in session.exec(select(AgentJob).order_by(col(AgentJob.created_at).desc())).all() if j.trip_id in names]
    by_type: Dict[str, List[AgentJob]] = {}
    for j in jobs:
        by_type.setdefault(str(j.job_type.value if hasattr(j.job_type, "value") else j.job_type), []).append(j)

    def st(j: AgentJob) -> str:
        return str(j.status.value if hasattr(j.status, "value") else j.status)

    roster = []
    for a in AGENTS:
        rows = by_type.get(a["id"], [])
        secs = [(j.completed_at - j.started_at).total_seconds() for j in rows if j.started_at and j.completed_at]
        running = [j for j in rows if st(j) in ("RUNNING", "RETRYING", "QUEUED", "CREATED")]
        last = rows[0] if rows else None
        roster.append(
            {
                **a,
                "total": len(rows),
                "completed": sum(1 for j in rows if st(j) == "COMPLETED"),
                "failed": sum(1 for j in rows if st(j) == "FAILED"),
                "running": len(running),
                "retried": sum(1 for j in rows if (j.attempt_count or 0) > 1),
                "avg_seconds": round(statistics.mean(secs), 1) if secs else None,
                "last_run": (last.completed_at or last.updated_at).isoformat() if last else None,
                "last_status": st(last) if last else None,
                "state": "working" if running else ("failing" if last and st(last) == "FAILED" else ("idle" if rows else "unused")),
            }
        )

    recent = []
    for j in jobs[:40]:
        result = j.result_payload or {}
        decision = result.get("decision") or {}
        recent.append(
            {
                "job_id": str(j.id),
                "agent": str(j.job_type.value if hasattr(j.job_type, "value") else j.job_type),
                "status": st(j),
                "trip_id": j.trip_id,
                "trip_name": names.get(j.trip_id or ""),
                "attempts": j.attempt_count,
                "created_at": j.created_at.isoformat(),
                "duration_s": round((j.completed_at - j.started_at).total_seconds(), 1) if j.started_at and j.completed_at else None,
                "error": j.error_message,
                "message": (j.input_payload or {}).get("message"),
                "decision": decision.get("action"),
                "reason": decision.get("reason"),
                "understood": [
                    f"{e.get('event_type')}: {e.get('poi_name') or ''}".strip(": ")
                    for e in ((result.get("understanding") or {}).get("existing_events") or [])
                ][:5],
                "optimizer": (result.get("optimization_result") or {}).get("solver_status"),
            }
        )
    return {"agents": roster, "recent": recent}



# ======================================================================
# Group trips: one shared plan, one branch per family
# ======================================================================

def _stops_of(data: Optional[dict]) -> Dict[int, List[Dict[str, Any]]]:
    from app.services.itinerary_format import normalize_itinerary

    out: Dict[int, List[Dict[str, Any]]] = {}
    if not data:
        return out
    try:
        data = normalize_itinerary(data)
    except Exception:
        return out
    for d in data.get("days", []):
        out[int(d.get("day") or 0)] = [
            {
                "location_id": str(p.get("location_id")),
                "name": p.get("name") or str(p.get("location_id")),
                "start": p.get("time_window_start"),
                "end": p.get("time_window_end"),
                "meal": p.get("category") == "meal",
            }
            for p in d.get("pois", [])
        ]
    return out


@router.get("/trips/{trip_id}/group")
async def trip_group(trip_id: str, user: TokenPayload = Depends(get_current_user), _: Any = Depends(verify_trip_access)) -> Any:
    """Every family's current branch of the trip, with what is shared by all of them."""
    from app.models.family import Family
    from app.models.itinerary import Itinerary
    from app.models.user import User
    from app.services.trip_service import TripService

    trip = TripService.get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    fam_ids: List[UUID] = []
    for f in trip.family_ids or []:
        try:
            u = UUID(str(f))
        except ValueError:
            continue
        if u not in fam_ids:
            fam_ids.append(u)

    families: List[Dict[str, Any]] = []
    per_family: Dict[str, Dict[int, List[Dict[str, Any]]]] = {}
    with Session(engine) as session:
        for fid in fam_ids:
            fam = session.get(Family, fid)
            if not fam:
                continue
            latest = session.exec(select(Itinerary).where(Itinerary.family_id == fid).order_by(col(Itinerary.version).desc())).first()
            who = session.exec(select(User).where(User.family_id == fid).order_by(User.created_at)).first()
            prefs = fam.preferences or {}
            families.append(
                {
                    "family_id": str(fid),
                    "code": fam.family_code,
                    "name": (who.full_name if who and who.full_name else fam.family_code),
                    "members": int(prefs.get("members", 1) or 1),
                    "children": int(prefs.get("children", 0) or 0),
                    "pace": prefs.get("pace_preference"),
                    "version": latest.version if latest else None,
                    "cost": latest.total_cost if latest else None,
                    "fit": round((latest.total_satisfaction or 0) * 10, 1) if latest else None,
                    "you": user.family_id == str(fid),
                }
            )
            per_family[str(fid)] = _stops_of(latest.data if latest else None)

    day_numbers = sorted({d for s in per_family.values() for d in s})
    days = []
    for d in day_numbers:
        merged: Dict[str, Dict[str, Any]] = {}
        for fid, by_day in per_family.items():
            for s in by_day.get(d, []):
                row = merged.setdefault(s["location_id"], {**s, "families": []})
                row["families"].append(fid)
        stops = sorted(merged.values(), key=lambda r: r.get("start") or "")
        for r in stops:
            r["shared"] = len(r["families"]) == len(per_family) and len(per_family) > 1
        days.append({"day": d, "stops": stops})

    total = len(per_family)
    shared_count = sum(1 for d in days for s in d["stops"] if s["shared"])
    branch_count = sum(1 for d in days for s in d["stops"] if not s["shared"])
    return {"trip_id": trip_id, "families": families, "days": days, "summary": {"families": total, "shared_stops": shared_count, "branch_stops": branch_count}}


# ======================================================================
# The optimizer engine
# ======================================================================

@router.get("/agent/engine")
async def engine_stats(agent: TokenPayload = Depends(get_current_agent)) -> Any:
    """What the optimizer measured offline on simulated trips, beside what it has done here."""
    bench: Optional[Dict[str, Any]] = None
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "scripts", "benchmark", "resume_metrics.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            bench = json.load(f)
    except Exception:
        bench = None
    with Session(engine) as session:
        feedback_jobs = session.exec(select(AgentJob).where(AgentJob.job_type == "AGENT_FEEDBACK")).all()
    secs = [(j.completed_at - j.started_at).total_seconds() for j in feedback_jobs if j.started_at and j.completed_at]
    return {
        "benchmark": bench,
        "live": {
            "feedback_jobs": len(feedback_jobs),
            "median_seconds": round(statistics.median(secs), 1) if secs else None,
            "p95_seconds": round(sorted(secs)[int(len(secs) * 0.95) - 1], 1) if len(secs) >= 5 else None,
        },
    }


# ======================================================================
# Agent notes and tasks on a trip
# ======================================================================

class NoteIn(BaseModel):
    kind: str = Field(default="note", pattern="^(note|task)$")
    text: str = Field(..., min_length=1, max_length=1000)
    due_on: Optional[datetime] = None


def _note(n: Any) -> Dict[str, Any]:
    return {
        "id": str(n.id),
        "trip_id": n.trip_id,
        "kind": n.kind,
        "text": n.text,
        "author": n.author_name,
        "due_on": n.due_on.isoformat() if n.due_on else None,
        "done": n.done,
        "created_at": n.created_at.isoformat(),
    }


@router.get("/agent/trips/{trip_id}/notes")
async def list_notes(trip_id: str, agent: TokenPayload = Depends(get_current_agent)) -> Any:
    from app.models.phase3 import TripNote
    from app.services.agency_service import ensure_trip_visible

    ensure_trip_visible(agent.sub, trip_id)

    with Session(engine) as session:
        rows = session.exec(select(TripNote).where(TripNote.trip_id == trip_id).order_by(col(TripNote.created_at).desc())).all()
        return {"notes": [_note(n) for n in rows]}


@router.post("/agent/trips/{trip_id}/notes", status_code=201)
async def add_note(trip_id: str, body: NoteIn, agent: TokenPayload = Depends(get_current_agent)) -> Any:
    from app.models.phase3 import TripNote
    from app.models.user import User
    from app.services.agency_service import ensure_trip_visible

    ensure_trip_visible(agent.sub, trip_id)

    with Session(engine) as session:
        me = session.get(User, UUID(agent.sub))
        n = TripNote(trip_id=trip_id, author_id=UUID(agent.sub), author_name=(me.full_name if me else None), kind=body.kind, text=body.text.strip(), due_on=body.due_on)
        session.add(n)
        session.commit()
        session.refresh(n)
        return _note(n)


@router.patch("/agent/notes/{note_id}")
async def toggle_note(note_id: UUID, done: bool, agent: TokenPayload = Depends(get_current_agent)) -> Any:
    from app.models.phase3 import TripNote

    with Session(engine) as session:
        n = session.get(TripNote, note_id)
        if not n:
            raise HTTPException(status_code=404, detail="Note not found")
        n.done = done
        session.add(n)
        session.commit()
        session.refresh(n)
        return _note(n)


@router.delete("/agent/notes/{note_id}")
async def delete_note(note_id: UUID, agent: TokenPayload = Depends(get_current_agent)) -> Any:
    from app.models.phase3 import TripNote

    with Session(engine) as session:
        n = session.get(TripNote, note_id)
        if not n:
            raise HTTPException(status_code=404, detail="Note not found")
        session.delete(n)
        session.commit()
        return {"deleted": True}


@router.get("/agent/tasks")
async def open_tasks(agent: TokenPayload = Depends(get_current_agent)) -> Any:
    """Every unfinished task across trips, soonest due first."""
    from app.models.phase3 import TripNote

    names = _trip_names(agent.sub)
    with Session(engine) as session:
        rows = [n for n in session.exec(select(TripNote).where(TripNote.kind == "task", TripNote.done == False)).all() if n.trip_id in names]  # noqa: E712
        out = [{**_note(n), "trip_name": names.get(n.trip_id)} for n in rows]
    out.sort(key=lambda r: (r["due_on"] is None, r["due_on"] or "", r["created_at"]))
    return {"tasks": out}
