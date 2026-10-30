"""
Notifications and webhooks.

`notify_*` writes one Notification row per recipient (the live stream and the bell read these) and,
for notices addressed to agents, also hands the event to every matching webhook endpoint.
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
    ids = list(dict.fromkeys(user_ids))
    if not ids:
        return 0
    try:
        with Session(engine) as session:
            rows = [Notification(user_id=uid, type=type, title=title[:200], body=body[:1000], link=link, data=data or {}) for uid in ids]
            for r in rows:
                session.add(r)
            session.commit()
            for r in rows:
                session.refresh(r)
            made = [(r.user_id, r.id) for r in rows]
        _push(made)
        from app.services import message_service

        message_service.fan_out(ids, type, title, body, link)
        return len(ids)
    except Exception as e:  # a notice must never break the action that caused it
        logger.error(f"Could not store notification {type}: {e}", exc_info=True)
        return 0


def _push(made: List[Any]) -> None:
    """Tell each person's open stream there is something new. Best effort: the table stays the source of truth."""
    try:
        import redis

        r = redis.from_url(settings.REDIS_URL, socket_connect_timeout=1, socket_timeout=1)
        for uid, nid in made:
            r.publish(f"notif:{uid}", str(nid))
    except Exception as e:
        logger.warning(f"Live push skipped: {e}")


def notify_agents(type: str, title: str, body: str = "", link: Optional[str] = None, data: Optional[Dict[str, Any]] = None) -> int:
    """Tell every agent, then send the event to their webhook endpoints."""
    try:
        from app.services.agency_service import agents_for_trip

        ids = agents_for_trip((data or {}).get("trip_id"))
    except Exception as e:
        logger.error(f"Could not list agents: {e}")
        return 0
    n = notify_users(ids, type, title, body, link, data)
    dispatch_event(type, title, body, link, data or {})
    return n


def notify_trip_travellers(trip_id: str, type: str, title: str, body: str = "", link: Optional[str] = None, data: Optional[Dict[str, Any]] = None) -> int:
    try:
        ids = users_for_trip(trip_id)
    except Exception as e:
        logger.error(f"Could not find travellers for {trip_id}: {e}")
        return 0
    return notify_users(ids, type, title, body, link, data)


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


def deliver(endpoint_id: UUID, event_type: str, title: str, body: str, link: Optional[str], data: Dict[str, Any]) -> WebhookDelivery:
    """Send one event, retrying twice on failure, and record every attempt as one delivery row."""
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
        row = WebhookDelivery(endpoint_id=endpoint_id, event_type=event_type, payload=payload, ok=ok, status_code=code, error=error, attempts=max(1, attempts), duration_ms=ms)
        session.add(row)
        ep = session.get(WebhookEndpoint, endpoint_id)
        if ep:
            ep.last_status = "ok" if ok else (f"failed {code}" if code else "failed")
            ep.last_delivery_at = datetime.utcnow()
            session.add(ep)
        session.commit()
        session.refresh(row)
        return row


def dispatch_event(event_type: str, title: str, body: str, link: Optional[str], data: Dict[str, Any]) -> None:
    """Hand the event to every active endpoint that subscribes to it. Runs in the background."""
    try:
        from app.services.agency_service import agency_of, trip_agency

        with Session(engine) as session:
            event_agency = trip_agency(session, data["trip_id"]) if data.get("trip_id") else None
            endpoints = session.exec(select(WebhookEndpoint).where(WebhookEndpoint.active == True)).all()  # noqa: E712
            targets = [
                e.id for e in endpoints
                if (not e.events or event_type in e.events) and agency_of(session, e.owner_id) == event_agency
            ]
    except Exception as e:
        logger.error(f"Could not list webhook endpoints: {e}")
        return
    for endpoint_id in targets:
        threading.Thread(target=_safe_deliver, args=(endpoint_id, event_type, title, body, link, data), daemon=True).start()


def _safe_deliver(*args: Any) -> None:
    try:
        deliver(*args)
    except Exception as e:
        logger.error(f"Webhook delivery crashed: {e}", exc_info=True)
