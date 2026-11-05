"""
Notifications and webhooks.

`notify_*` records an announcement in the transactional outbox and returns; delivery happens straight away
(fast path) or, if that fails, from the dispatcher, with retries. Delivery writes one Notification row per
recipient (the live stream and the bell read these), sends any email or SMS, and for notices addressed to
agents hands the event to every matching webhook endpoint. Each announcement carries a stable event id, so
a repeated delivery is recognised: no duplicate notification, email or webhook.
"""

import hashlib
import hmac
import ipaddress
import json
import logging
import socket
import threading
import time
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional
from urllib.parse import urlparse
from uuid import UUID

import requests
from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine
from app.models.phase3 import Notification, WebhookDelivery, WebhookEndpoint
from app.models.user import User

logger = logging.getLogger(__name__)

# Every event the platform can announce. Webhooks subscribe to these by name.
EVENTS: Dict[str, str] = {
    "decision.created": "A first plan or a change request is waiting for a decision",
    "decision.accepted": "An agent accepted an option",
    "decision.declined": "An agent declined a request",
    "plan.published": "A new plan version reached the traveller",
    "feedback.received": "A traveller sent feedback",
    "feedback.processed": "Feedback was turned into a new plan or saved",
    "job.failed": "An AI agent job failed",
    "booking.created": "A booking was recorded for a trip",
    "booking.updated": "A booking changed status",
    "webhook.test": "A test event sent from the webhook settings",
}


def _agent_ids(session: Session) -> List[UUID]:
    return [u.id for u in session.exec(select(User).where(User.role == "agent", User.is_active == True)).all()]  # noqa: E712


def users_for_trip(trip_id: str) -> List[UUID]:
    """Travellers whose family is on the trip."""
    from app.services.trip_service import TripService

    trip = TripService.get_trip(trip_id)
    if not trip:
        return []
    family_ids = [UUID(str(f)) for f in (trip.family_ids or []) if _is_uuid(f)]
    if not family_ids:
        return []
    with Session(engine) as session:
        users = session.exec(select(User).where(User.family_id.in_(family_ids), User.role == "traveller")).all()  # type: ignore[attr-defined]
        return [u.id for u in users]


def _is_uuid(value: Any) -> bool:
    try:
        UUID(str(value))
        return True
    except (ValueError, TypeError):
        return False


def notify_users(
    user_ids: Iterable[UUID],
    type: str,
    title: str,
    body: str = "",
    link: Optional[str] = None,
    data: Optional[Dict[str, Any]] = None,
) -> int:
    ids = [str(u) for u in dict.fromkeys(user_ids)]
    if not ids:
        return 0
    return _enqueue("notify_users", {"user_ids": ids, **_content(type, title, body, link, data)})


def notify_agents(type: str, title: str, body: str = "", link: Optional[str] = None, data: Optional[Dict[str, Any]] = None) -> int:
    """Tell every agent responsible for the trip, then send the event to their webhook endpoints."""
    return _enqueue("notify_agents", _content(type, title, body, link, data))


def notify_trip_travellers(trip_id: str, type: str, title: str, body: str = "", link: Optional[str] = None, data: Optional[Dict[str, Any]] = None) -> int:
    return _enqueue("notify_trip_travellers", {"trip_id": trip_id, **_content(type, title, body, link, data)})


def announcement(kind: str, **payload: Any) -> Dict[str, Any]:
    """The outbox payload for an announcement, for callers that write it inside their own transaction."""
    content = _content(payload.pop("type"), payload.pop("title"), payload.pop("body", ""), payload.pop("link", None), payload.pop("data", None))
    return {**payload, **content}


def _content(type: str, title: str, body: str, link: Optional[str], data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    return {"type": type, "title": title[:200], "body": (body or "")[:1000], "link": link, "data": json.loads(json.dumps(data or {}, default=str))}


def _enqueue(kind: str, payload: Dict[str, Any]) -> int:
    from app.services import outbox_service

    try:
        outbox_service.enqueue(kind, payload)
        return 1
    except Exception as e:  # a notice must never break the action that caused it
        logger.error(f"Could not record announcement {payload.get('type')}: {e}", exc_info=True)
        return 0


def deliver_announcement(kind: str, p: Dict[str, Any], event_id: str) -> None:
    """Run by the outbox. Raises on failure so the outbox retries; safe to run twice for one event."""
    if kind == "notify_users":
        ids = [UUID(u) for u in p.get("user_ids", [])]
    elif kind == "notify_trip_travellers":
        ids = users_for_trip(p["trip_id"])
    elif kind == "notify_agents":
        from app.services.agency_service import agents_for_trip

        ids = agents_for_trip((p.get("data") or {}).get("trip_id"))
    else:
        raise ValueError(f"Not an announcement: {kind}")
    _store_and_push(ids, p["type"], p["title"], p.get("body", ""), p.get("link"), p.get("data") or {}, event_id)
    if kind == "notify_agents":
        dispatch_event(p["type"], p["title"], p.get("body", ""), p.get("link"), p.get("data") or {}, event_id=event_id, sync=True)


def _store_and_push(ids: List[UUID], type: str, title: str, body: str, link: Optional[str], data: Dict[str, Any], event_id: str) -> None:
    ids = list(dict.fromkeys(ids))
    if not ids:
        return
    from sqlalchemy.dialects.postgresql import insert

    with Session(engine) as session:
        made = session.execute(
            insert(Notification).values([
                {"user_id": uid, "type": type, "title": title, "body": body, "link": link, "data": data,
                 "event_id": event_id, "created_at": datetime.utcnow()} for uid in ids
            ]).on_conflict_do_nothing(constraint="uq_notifications_user_event").returning(Notification.user_id, Notification.id)
        ).all()
        session.commit()
    made = [(row[0], row[1]) for row in made]
    if not made:
        return  # every recipient already had this announcement: a repeat delivery
    _push(made)
    from app.services import message_service

    message_service.fan_out([uid for uid, _ in made], type, title, body, link)


def _push(made: List[Any]) -> None:
    """Tell each person's open stream there is something new. Best effort: the table stays the source of truth."""
    try:
        import redis

        from app.core.redis import ephemeral_url

        r = redis.from_url(ephemeral_url(), socket_connect_timeout=1, socket_timeout=1)
        for uid, nid in made:
            r.publish(f"notif:{uid}", str(nid))
    except Exception as e:
        logger.warning(f"Live push skipped: {e}")


# ---------------------------------------------------------------------------
# Webhooks
# ---------------------------------------------------------------------------

def sign(secret: str, timestamp: str, body: bytes) -> str:
    return "sha256=" + hmac.new(secret.encode(), timestamp.encode() + b"." + body, hashlib.sha256).hexdigest()


def url_is_allowed(url: str) -> Optional[str]:
    """None when the URL may be called, otherwise the reason it may not."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return "The URL must start with http:// or https://"
    if settings.WEBHOOK_ALLOW_PRIVATE:
        return None
    try:
        for info in socket.getaddrinfo(parsed.hostname, parsed.port or (443 if parsed.scheme == "https" else 80)):
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return "That address is private. Webhooks may only call public URLs."
    except socket.gaierror:
        return "That host name could not be found."
    return None


def _body_for(format: str, event_type: str, title: str, body: str, link: Optional[str], data: Dict[str, Any]) -> Dict[str, Any]:
    text = f"{title}" + (f"\n{body}" if body else "")
    if format == "slack":
        return {"text": text}
    if format == "discord":
        return {"content": text[:1900]}
    return {
        "event": event_type,
        "title": title,
        "body": body,
        "link": link,
        "data": data,
        "sent_at": datetime.utcnow().isoformat() + "Z",
    }


def deliver(endpoint_id: UUID, event_type: str, title: str, body: str, link: Optional[str], data: Dict[str, Any],
            event_id: Optional[str] = None) -> WebhookDelivery:
    """Send one event, retrying twice on failure, and record every attempt as one delivery row.

    The address is checked again here, at the moment of sending, and redirects are never followed, so an
    endpoint cannot be pointed at an internal address after it was registered.
    """
    with Session(engine) as session:
        ep = session.get(WebhookEndpoint, endpoint_id)
        if not ep:
            raise ValueError("Endpoint not found")
        url, secret, fmt = ep.url, ep.secret, ep.format

    payload = _body_for(fmt, event_type, title, body, link, data)
    raw = json.dumps(payload, default=str).encode()
    blocked = url_is_allowed(url)
    ok, code, error, attempts, ms = False, None, blocked, 0, None
    if not blocked:
        for attempt in range(1, 4):
            attempts = attempt
            ts = str(int(time.time()))
            started = time.time()
            try:
                r = requests.post(
                    url,
                    data=raw,
                    headers={
                        "Content-Type": "application/json",
                        "User-Agent": "Merydian-Webhooks/1",
                        "X-Merydian-Event": event_type,
                        "X-Merydian-Event-Id": event_id or "",
                        "X-Merydian-Timestamp": ts,
                        "X-Merydian-Signature": sign(secret, ts, raw),
                    },
                    timeout=8,
                    allow_redirects=False,
                )
                code, ms = r.status_code, int((time.time() - started) * 1000)
                ok = 200 <= r.status_code < 300
                error = None if ok else f"The endpoint answered {r.status_code}"
            except requests.RequestException as e:
                ms = int((time.time() - started) * 1000)
                error = str(e)[:280]
            if ok:
                break
            time.sleep(1.5 * attempt)

    with Session(engine) as session:
        row = WebhookDelivery(endpoint_id=endpoint_id, event_type=event_type, payload=payload, ok=ok, status_code=code, error=error,
                              attempts=max(1, attempts), duration_ms=ms, event_id=event_id)
        session.add(row)
        ep = session.get(WebhookEndpoint, endpoint_id)
        if ep:
            ep.last_status = "ok" if ok else (f"failed {code}" if code else "failed")
            ep.last_delivery_at = datetime.utcnow()
            session.add(ep)
        session.commit()
        session.refresh(row)
        return row


def dispatch_event(event_type: str, title: str, body: str, link: Optional[str], data: Dict[str, Any],
                   event_id: Optional[str] = None, sync: bool = False) -> None:
    """Hand the event to every active endpoint that subscribes to it.

    From the outbox (sync=True) each endpoint is called in turn, and one that already received this
    event_id is skipped, so a repeated delivery never calls an endpoint twice.
    """
    try:
        from app.services.agency_service import agency_of, trip_agency

        with Session(engine) as session:
            event_agency = trip_agency(session, data["trip_id"]) if data.get("trip_id") else None
            endpoints = session.exec(select(WebhookEndpoint).where(WebhookEndpoint.active == True)).all()  # noqa: E712
            targets = [
                e.id for e in endpoints
                if (not e.events or event_type in e.events) and agency_of(session, e.owner_id) == event_agency
            ]
            if event_id and targets:
                done = set(session.exec(select(WebhookDelivery.endpoint_id).where(
                    WebhookDelivery.event_id == event_id, WebhookDelivery.endpoint_id.in_(targets))).all())  # type: ignore[attr-defined]
                targets = [t for t in targets if t not in done]
    except Exception as e:
        logger.error(f"Could not list webhook endpoints: {e}")
        if sync:
            raise
        return
    for endpoint_id in targets:
        if sync:
            _safe_deliver(endpoint_id, event_type, title, body, link, data, event_id)
        else:
            threading.Thread(target=_safe_deliver, args=(endpoint_id, event_type, title, body, link, data, event_id), daemon=True).start()


def _safe_deliver(*args: Any) -> None:
    try:
        deliver(*args)
    except Exception as e:
        logger.error(f"Webhook delivery crashed: {e}", exc_info=True)
