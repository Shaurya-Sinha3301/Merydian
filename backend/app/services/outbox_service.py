"""
Writing to and delivering from the transactional outbox (see app/models/outbox.py).

Writing: add(session, kind, payload) joins the caller's transaction. After the caller commits, it may call
try_now(ids) as a fast path, which delivers at once so the usual delay is near zero.

Delivering: dispatch_batch() takes due rows that no other dispatcher holds (FOR UPDATE SKIP LOCKED), marks
them in progress, delivers each and marks it sent. A failure is retried with growing waits; after
MAX_ATTEMPTS the row is parked as dead for a person to look at. A row left in progress by a dispatcher that
died is picked up again after STUCK_AFTER. Delivery is at-least-once, so every receiver tolerates repeats.
"""
import logging
import threading
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy import or_, select, update
from sqlmodel import Session

from app.core.db import engine
from app.models.outbox import OutboxMessage

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 8
JOB_TASK = "app.workers.agent_tasks.execute_agent_job_task"
STUCK_AFTER = timedelta(seconds=60)
_fast_path = True  # turned off only by tests that simulate a process dying right after its commit


def add(session: Session, kind: str, payload: Dict[str, Any]) -> OutboxMessage:
    """Record something to do after the caller's transaction commits. Joins that transaction."""
    row = OutboxMessage(kind=kind, payload=payload)
    session.add(row)
    session.flush()
    return row


def enqueue(kind: str, payload: Dict[str, Any]) -> None:
    """For callers without a transaction of their own: write the row now, then try to deliver it."""
    with Session(engine) as s:
        row = add(s, kind, payload)
        rid = row.id
        s.commit()
    try_now([rid])


def try_now(ids: Iterable[Optional[int]]) -> None:
    """Fast path: deliver these rows immediately. Anything that fails here is left for the dispatcher."""
    if not _fast_path:
        return
    for rid in [i for i in ids if i]:
        try:
            row = _claim_one(rid)
            if row is not None:
                _run(row)
        except Exception as exc:
            logger.warning("Outbox fast path left row %s for the dispatcher: %s", rid, exc)


def _claim_one(rid: int) -> Optional[OutboxMessage]:
    # expire_on_commit=False: the claimed row is used after this session closes
    with Session(engine, expire_on_commit=False) as s:
        now = datetime.utcnow()
        res = s.execute(
            update(OutboxMessage).where(OutboxMessage.id == rid, OutboxMessage.status == "pending")
            .values(status="in_progress", locked_at=now, attempts=OutboxMessage.attempts + 1)
            .returning(OutboxMessage)
        ).scalars().first()
        s.commit()
        if res is not None:
            s.expunge(res)
        return res


def _claim_batch(limit: int) -> List[OutboxMessage]:
    now = datetime.utcnow()
    with Session(engine) as s:
        rows = s.execute(
            select(OutboxMessage).where(
                or_(
                    (OutboxMessage.status == "pending") & (OutboxMessage.next_attempt_at <= now),
                    (OutboxMessage.status == "in_progress") & (OutboxMessage.locked_at < now - STUCK_AFTER),
                )
            ).order_by(OutboxMessage.id).limit(limit).with_for_update(skip_locked=True)
        ).scalars().all()
        for r in rows:
            r.status, r.locked_at, r.attempts = "in_progress", now, r.attempts + 1
            s.add(r)
        s.commit()
        for r in rows:
            s.refresh(r)
            s.expunge(r)
        return list(rows)


def dispatch_batch(limit: int = 50) -> int:
    """Deliver up to `limit` due rows. Returns how many were taken."""
    rows = _claim_batch(limit)
    for row in rows:
        _run(row)
    return len(rows)


def _run(row: OutboxMessage) -> None:
    try:
        _deliver(row)
    except Exception as exc:
        _failed(row, exc)
        return
    with Session(engine) as s:
        s.execute(update(OutboxMessage).where(OutboxMessage.id == row.id)
                  .values(status="sent", sent_at=datetime.utcnow(), last_error=None))
        s.commit()


def _failed(row: OutboxMessage, exc: Exception) -> None:
    dead = row.attempts >= MAX_ATTEMPTS
    wait = timedelta(seconds=min(5 * 2 ** max(row.attempts - 1, 0), 600))
    with Session(engine) as s:
        s.execute(update(OutboxMessage).where(OutboxMessage.id == row.id).values(
            status="dead" if dead else "pending", next_attempt_at=datetime.utcnow() + wait,
            last_error=str(exc)[:500], locked_at=None))
        s.commit()
    (logger.error if dead else logger.warning)(
        "Outbox row %s (%s) failed on attempt %s%s: %s", row.id, row.kind, row.attempts,
        ", parked as dead" if dead else f", retry in {int(wait.total_seconds())} s", exc)


def _deliver(row: OutboxMessage) -> None:
    p = row.payload or {}
    eid = str(row.event_id)
    if row.kind == "publish_job":
        from app.core.celery_app import celery_app

        # By name: the API image has no worker code to import, and needs none to queue a job
        celery_app.send_task(JOB_TASK, args=[p["job_id"]])
    elif row.kind == "run_task":
        from app.core.celery_app import celery_app

        celery_app.send_task(p["task"], args=p.get("args") or [], kwargs=p.get("kwargs") or {})
    elif row.kind in ("notify_users", "notify_agents", "notify_trip_travellers"):
        from app.services import notification_service as ns

        ns.deliver_announcement(row.kind, p, eid)
    elif row.kind == "refresh_plan_cache":
        from app.services import plan_cache

        # Reads the plan as it is now and keeps it only if newer than the cached one, so repeats are harmless
        plan_cache.refresh(p["family_id"])
    else:
        raise ValueError(f"Unknown outbox kind: {row.kind}")


# ---------------------------------------------------------------------------
# The dispatcher loop, run inside a worker process
# ---------------------------------------------------------------------------
_started = False


def start_dispatcher(poll_seconds: float = 1.0) -> None:
    """Start a background loop that delivers due rows. Safe to call more than once."""
    global _started
    if _started:
        return
    _started = True

    def loop() -> None:
        stop = threading.Event()
        while not stop.is_set():
            try:
                taken = dispatch_batch()
            except Exception as exc:
                logger.error("Outbox dispatcher pass failed: %s", exc)
                taken = 0
            if not taken:
                stop.wait(poll_seconds)

    threading.Thread(target=loop, name="outbox-dispatcher", daemon=True).start()
    logger.info("Outbox dispatcher started")
