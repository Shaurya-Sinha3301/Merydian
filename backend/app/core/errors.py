"""
Error tracking without an external service: unhandled errors grouped by where they happen.

Each unhandled exception (in a request or a background job) is reduced to a fingerprint: its type and the
innermost line of this project's code it passed through. Errors with the same fingerprint are one group with
a count, first and last time seen, and the last request id, so a recurring fault shows up as one row with a
rising count instead of a scroll of log lines. Recording never raises: tracking must not cause errors.
"""
import hashlib
import logging
import traceback
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


def _location(exc: BaseException) -> str:
    frames = traceback.extract_tb(exc.__traceback__) if exc.__traceback__ else []
    ours = [f for f in frames if "/app/" in f.filename.replace("\\", "/") or "\\app\\" in f.filename]
    frame = (ours or frames or [None])[-1]
    if frame is None:
        return "unknown"
    path = frame.filename.replace("\\", "/")
    path = path[path.find("/app/") + 1:] if "/app/" in path else path.rsplit("/", 1)[-1]
    return f"{path}:{frame.lineno} in {frame.name}"


def record(exc: BaseException, request_id: Optional[str] = None, where: Optional[str] = None) -> Optional[str]:
    """Count this error in its group. Returns the fingerprint, or None if it could not be stored."""
    try:
        from sqlalchemy.dialects.postgresql import insert
        from sqlmodel import Session

        from app.core.db import engine
        from app.models.error_group import ErrorGroup

        location = _location(exc)
        kind = type(exc).__name__
        fingerprint = hashlib.sha256(f"{kind}|{location}".encode()).hexdigest()[:32]
        now = datetime.utcnow()
        values = {"fingerprint": fingerprint, "type": kind, "message": str(exc)[:500], "location": location[:300],
                  "count": 1, "first_seen": now, "last_seen": now, "last_request_id": (request_id or "")[:64],
                  "last_where": (where or "")[:200]}
        stmt = insert(ErrorGroup).values(**values)
        stmt = stmt.on_conflict_do_update(index_elements=["fingerprint"], set_={
            "count": ErrorGroup.count + 1, "last_seen": now, "message": values["message"],
            "last_request_id": values["last_request_id"], "last_where": values["last_where"]})
        with Session(engine) as s:
            s.execute(stmt)
            s.commit()
        return fingerprint
    except Exception as e:  # never let tracking break the caller
        logger.warning("Could not record error group: %s", e)
        return None
