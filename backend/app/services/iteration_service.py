"""
Reads and writes the trip iteration record (see app/models/trip_iteration.py).

This is where the optimizer's working state lives. Nothing here touches the file system, so any worker
can pick up any trip.
"""
import json
import logging
from typing import Any, Dict, Optional
from uuid import UUID

from sqlmodel import Session, select

from app.core.db import engine
from app.models.trip_iteration import TripIteration
from app.models.trip_session import TripSession

logger = logging.getLogger(__name__)


def _json_safe(value: Any) -> Any:
    return json.loads(json.dumps(value, default=str))


def record(
    trip_id: str,
    kind: str,
    input_snapshot: Dict[str, Any],
    result: Dict[str, Any],
    family_id: Optional[str] = None,
    optimizer_ran: bool = True,
    job_id: Optional[UUID] = None,
    session: Optional[Session] = None,
) -> int:
    """Append one iteration and return its number.

    The trip's session row is locked while the next number is chosen, so two writers for one trip take
    turns. A unique rule on (trip, iteration) refuses a duplicate if anything slipped past the lock.
    When a session is passed in, the row joins that transaction instead of committing on its own.
    """
    own = session is None
    s = session or Session(engine)
    try:
        s.exec(select(TripSession).where(TripSession.trip_id == trip_id).with_for_update()).first()
        latest = s.exec(
            select(TripIteration.iteration).where(TripIteration.trip_id == trip_id).order_by(TripIteration.iteration.desc())
        ).first()
        number = (latest if latest is not None else -1) + 1
        s.add(TripIteration(
            trip_id=trip_id, iteration=number, kind=kind, family_id=family_id, job_id=job_id,
            optimizer_ran=optimizer_ran, input_snapshot=_json_safe(input_snapshot), result=_json_safe(result),
        ))
        if own:
            s.commit()
        else:
            s.flush()
        return number
    finally:
        if own:
            s.close()


def latest(trip_id: str, family_id: Optional[str] = None) -> Optional[TripIteration]:
    """The newest iteration for a trip, optionally for one family's branch (falling back to trip-wide rows)."""
    with Session(engine) as s:
        q = select(TripIteration).where(TripIteration.trip_id == trip_id)
        if family_id:
            row = s.exec(q.where(TripIteration.family_id == family_id).order_by(TripIteration.iteration.desc())).first()
            if row:
                return row
        return s.exec(q.order_by(TripIteration.iteration.desc())).first()


def latest_result(trip_id: str, family_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    row = latest(trip_id, family_id)
    return row.result if row and row.result else None


def count(trip_id: str) -> int:
    with Session(engine) as s:
        return len(s.exec(select(TripIteration.id).where(TripIteration.trip_id == trip_id)).all())
