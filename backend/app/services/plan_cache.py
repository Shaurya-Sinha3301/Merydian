"""
The read cache for a family's current plan. Postgres is the record; this only saves reads.

Three rules keep it correct while a trip keeps changing:

1. Every change refreshes it, and no writer has to remember to. A session hook sees any flush that moves
   families.current_itinerary_version (a new version, a revert, a reset), raises families.plan_rev in the
   same UPDATE and adds a `refresh_plan_cache` outbox row in the same transaction. So the refresh cannot be
   lost between the commit and Redis, and it runs right after the commit (the outbox fast path), before the
   browsers that the live notification wakes up come back for the new plan.

2. Old never overwrites new. Each cache entry carries the revision it was read at, and Redis keeps a write
   only if its revision is higher (one Lua script, so the check and the write cannot be split). A refresh
   delivered twice, a slow reader filling the cache late, or two refreshes landing out of order all end with
   the newest plan in the cache.

3. The cache can only make reads faster, never fail them. If the cache Redis is slow or down, reads go to
   Postgres. When the entry is missing, one request per family rebuilds it (a short lock) and the others
   wait briefly for it instead of all reading Postgres at once.

The ETag is the family and the revision, so a browser that already has the current plan gets 304 with no body.
"""
import asyncio
import json
import logging
import threading
from collections import Counter
from typing import Optional, Tuple
from uuid import UUID

from sqlalchemy import event, inspect, select
from sqlalchemy.orm import Session as OrmSession

from app.core.config import settings

logger = logging.getLogger(__name__)

KIND = "refresh_plan_cache"
NO_PLAN = "null"  # cached body when the family has no current plan; it still carries a revision
FILL_LOCK_MS = 3000
FILL_WAIT_STEPS, FILL_WAIT_SECONDS = 60, 0.05  # a request that did not get the fill lock waits as long as the lock lasts

# Only writes a revision higher than the one stored. Returns 1 if written.
_CAS = """
local cur = redis.call('HGET', KEYS[1], 'rev')
if cur and tonumber(cur) >= tonumber(ARGV[1]) then return 0 end
redis.call('HSET', KEYS[1], 'rev', ARGV[1], 'body', ARGV[2])
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[3]))
return 1
"""

# Reads served, by where the answer came from, in this process. Shown on /metrics.
reads: Counter = Counter()
_reads_lock = threading.Lock()


def _count(source: str) -> None:
    with _reads_lock:
        reads[source] += 1


def key(family_id) -> str:
    return f"plan:{family_id}"


def etag(family_id, rev: int) -> str:
    return f'"{family_id}-{rev}"'


def ttl() -> int:
    return int(getattr(settings, "PLAN_CACHE_TTL_SECONDS", 900))


# ---------------------------------------------------------------------------
# Postgres: the revision and the plan, read together in one statement
# ---------------------------------------------------------------------------
def load(family_id) -> Optional[Tuple[int, str]]:
    """(revision, plan as JSON text) from Postgres, or None if the family does not exist."""
    from sqlmodel import Session

    from app.core.db import engine
    from app.models.family import Family
    from app.models.itinerary import Itinerary

    with Session(engine) as s:
        row = s.execute(
            select(Family.plan_rev, Itinerary.data).select_from(Family)
            .outerjoin(Itinerary, Itinerary.id == Family.current_itinerary_version)
            .where(Family.id == UUID(str(family_id)))
        ).first()
    if row is None:
        return None
    rev, data = row
    return int(rev or 0), (json.dumps(data, default=str) if data is not None else NO_PLAN)


# ---------------------------------------------------------------------------
# Write side: called by the outbox, in whichever process delivers the row
# ---------------------------------------------------------------------------
_sync_client = None


def _sync_redis():
    global _sync_client
    if _sync_client is None:
        import redis

        from app.core.redis import ephemeral_url

        _sync_client = redis.from_url(ephemeral_url(), decode_responses=True, socket_connect_timeout=2, socket_timeout=2)
    return _sync_client


def refresh(family_id) -> bool:
    """Put the family's current plan in the cache. Raises if Redis is unreachable, so the outbox retries."""
    loaded = load(family_id)
    r = _sync_redis()
    if loaded is None:  # the family was deleted
        r.delete(key(family_id))
        return False
    rev, body = loaded
    return bool(r.eval(_CAS, 1, key(family_id), rev, body, ttl()))


# ---------------------------------------------------------------------------
# Read side: the plan endpoint
# ---------------------------------------------------------------------------
async def _redis_call(coro):
    from app.core.redis import ephemeral_call

    return await ephemeral_call(coro)


async def read(family_id) -> Optional[Tuple[int, str]]:
    """(revision, plan JSON) for the family, from the cache when it can, else Postgres. None if no family."""
    from starlette.concurrency import run_in_threadpool

    from app.core.redis import ephemeral_available, get_ephemeral_redis

    k = key(family_id)
    if not ephemeral_available():  # failed moments ago: go straight to Postgres
        _count("postgres_cache_down")
        return await run_in_threadpool(load, family_id)
    try:
        r = await get_ephemeral_redis()
        rev, body = await _redis_call(r.hmget(k, "rev", "body"))
    except Exception as exc:
        logger.warning("Plan cache unavailable, reading Postgres: %s", exc)
        _count("postgres_cache_down")
        return await run_in_threadpool(load, family_id)
    if rev is not None and body is not None:
        _count("cache")
        return int(rev), body

    # Missing. One request per family rebuilds it; the rest wait a moment for that instead of all going to Postgres.
    lock = f"plan:fill:{family_id}"
    try:
        have_lock = bool(await _redis_call(r.set(lock, "1", nx=True, px=FILL_LOCK_MS)))
    except Exception:
        have_lock = True
    if not have_lock:
        for _ in range(FILL_WAIT_STEPS):
            await asyncio.sleep(FILL_WAIT_SECONDS)
            try:
                rev, body = await _redis_call(r.hmget(k, "rev", "body"))
            except Exception:
                break
            if rev is not None and body is not None:
                _count("cache_after_wait")
                return int(rev), body
    loaded = await run_in_threadpool(load, family_id)
    _count("postgres")
    try:
        if loaded is not None:
            await _redis_call(r.eval(_CAS, 1, k, loaded[0], loaded[1], ttl()))
        if have_lock:
            await _redis_call(r.delete(lock))
    except Exception as exc:
        logger.warning("Could not fill the plan cache: %s", exc)
    return loaded


# ---------------------------------------------------------------------------
# The session hook: any change to a family's current plan raises its revision and queues a refresh
# ---------------------------------------------------------------------------
_ROWS, _IDS, _READY = "plan_cache_rows", "plan_cache_ids", "plan_cache_ready"


def _pointer_changed(obj) -> bool:
    state = inspect(obj)
    if state.pending:
        return obj.current_itinerary_version is not None
    return state.attrs.current_itinerary_version.history.has_changes()


def _before_flush(session, flush_context, instances) -> None:
    from app.models.family import Family
    from app.models.outbox import OutboxMessage

    for obj in list(session.new) + list(session.dirty):
        if not isinstance(obj, Family) or not _pointer_changed(obj):
            continue
        if inspect(obj).pending:
            obj.plan_rev = 1
        else:
            # Raised inside the UPDATE itself, so two writers can never hand out the same revision
            obj.plan_rev = Family.plan_rev + 1
        row = OutboxMessage(kind=KIND, payload={"family_id": str(obj.id)})
        session.add(row)
        session.info.setdefault(_ROWS, []).append(row)


def _after_flush(session, flush_context) -> None:
    rows = session.info.pop(_ROWS, None)
    if rows:
        session.info.setdefault(_IDS, []).extend(r.id for r in rows)


def _after_commit(session) -> None:
    # Not delivered here: SQLAlchemy fires after_commit while the session still holds its connection, and
    # the refresh needs connections of its own. Twenty writers at once would hold the whole pool and wait
    # for more. Delivery waits until the transaction has closed and handed its connection back.
    ids = session.info.pop(_IDS, None)
    if ids:
        session.info.setdefault(_READY, []).extend(ids)


def _after_transaction_end(session, transaction) -> None:
    if transaction.parent is not None:
        return
    ids = session.info.pop(_READY, None)
    if not ids:
        return
    try:
        from app.services import outbox_service

        outbox_service.try_now(ids)  # anything this misses, the dispatcher delivers
    except Exception as exc:
        logger.warning("Plan cache refresh left for the dispatcher: %s", exc)


def _after_rollback(session) -> None:
    session.info.pop(_ROWS, None)
    session.info.pop(_IDS, None)


_installed = False


def install() -> None:
    """Register the hook on every ORM session. Safe to call more than once."""
    global _installed
    if _installed:
        return
    _installed = True
    event.listen(OrmSession, "before_flush", _before_flush)
    event.listen(OrmSession, "after_flush", _after_flush)
    event.listen(OrmSession, "after_commit", _after_commit)
    event.listen(OrmSession, "after_transaction_end", _after_transaction_end)
    event.listen(OrmSession, "after_soft_rollback", lambda s, prev: _after_rollback(s))
