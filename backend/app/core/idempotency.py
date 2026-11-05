"""
Idempotency-Key handling for requests that cost money or create records.

Only requests that carry an Idempotency-Key header and a credential are affected; everything else passes
straight through. For a write under /api/v1 (outside sign-in, the demo door and the dev outbox):

  * new key            -> recorded as in progress, the request runs, a successful or client-error response is
                          saved and returned. A server error releases the key so the client can retry.
  * same key, finished -> the saved response is returned again, marked "Idempotent-Replayed: true".
                          For a request that started a job, that is the same job, not a new one.
  * same key, running  -> 409, "already being processed", with a short Retry-After.
  * same key, different request body -> 422, because that is a client bug.

The database decides races: two identical requests arriving together cannot both insert the key.
Correctness never depends on Redis. Keys expire after a day.
"""
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session
from starlette.concurrency import run_in_threadpool
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.db import engine
from app.models.idempotency import IdempotencyKey

logger = logging.getLogger(__name__)

HEADER = "Idempotency-Key"
TTL = timedelta(hours=24)
MAX_STORED_BODY = 1_000_000
METHODS = {"POST", "PUT", "PATCH"}
EXCLUDED_PREFIXES = ("/api/v1/auth/", "/api/v1/demo/", "/api/v1/dev/")


def _applies(request: Request) -> bool:
    path = request.url.path
    return (
        request.method in METHODS
        and path.startswith("/api/v1/")
        and not path.startswith(EXCLUDED_PREFIXES)
        and request.headers.get(HEADER) is not None
        and request.headers.get("authorization") is not None
    )


def _claim(scope: str, endpoint: str, key: str, request_hash: str) -> Optional[IdempotencyKey]:
    """Insert the key as in progress. Returns None if we now own it, else the existing row."""
    now = datetime.utcnow()
    with Session(engine) as s:
        for _ in range(2):
            stmt = insert(IdempotencyKey).values(
                scope=scope, endpoint=endpoint, key=key, request_hash=request_hash,
                status="in_progress", created_at=now, expires_at=now + TTL,
            ).on_conflict_do_nothing(constraint="uq_idempotency_scope_endpoint_key").returning(IdempotencyKey.id)
            if s.execute(stmt).first() is not None:
                s.commit()
                return None
            row = s.execute(select(IdempotencyKey).where(
                IdempotencyKey.scope == scope, IdempotencyKey.endpoint == endpoint, IdempotencyKey.key == key)).scalar_one_or_none()
            if row is None:
                continue  # released between our insert and our read; try once more
            if row.expires_at < now:
                s.execute(delete(IdempotencyKey).where(IdempotencyKey.id == row.id))
                s.commit()
                continue
            s.expunge(row)
            return row
    return None


def _finish(scope: str, endpoint: str, key: str, status: int, media_type: Optional[str], body: bytes) -> None:
    with Session(engine) as s:
        row = s.execute(select(IdempotencyKey).where(
            IdempotencyKey.scope == scope, IdempotencyKey.endpoint == endpoint, IdempotencyKey.key == key)).scalar_one_or_none()
        if row is None:
            return
        if status >= 500 or len(body) > MAX_STORED_BODY:
            s.delete(row)  # release: a retry with the same key will run the request again
        else:
            row.status = "done"
            row.response_status = status
            row.response_type = media_type
            row.response_body = body.decode("utf-8", "replace")
            s.add(row)
        s.commit()


def _release(scope: str, endpoint: str, key: str) -> None:
    with Session(engine) as s:
        s.execute(delete(IdempotencyKey).where(
            IdempotencyKey.scope == scope, IdempotencyKey.endpoint == endpoint, IdempotencyKey.key == key))
        s.commit()


async def middleware(request: Request, call_next):
    if not _applies(request):
        return await call_next(request)

    key = request.headers[HEADER].strip()
    if not key or len(key) > 255:
        return JSONResponse({"detail": "Idempotency-Key must be 1 to 255 characters"}, status_code=400)
    body = await request.body()
    scope = hashlib.sha256(request.headers["authorization"].encode()).hexdigest()
    endpoint = f"{request.method} {request.url.path}"
    request_hash = hashlib.sha256(endpoint.encode() + b"\n" + request.url.query.encode() + b"\n" + body).hexdigest()

    try:
        existing = await run_in_threadpool(_claim, scope, endpoint, key, request_hash)
    except Exception as exc:  # the store is unavailable: run the request once, unprotected, and say so
        logger.error("Idempotency store unavailable, request runs unprotected: %s", exc)
        return await call_next(request)

    if existing is not None:
        if existing.request_hash != request_hash:
            return JSONResponse({"detail": "This Idempotency-Key was already used for a different request"}, status_code=422)
        if existing.status != "done":
            return JSONResponse({"detail": "This request is already being processed"}, status_code=409, headers={"Retry-After": "2"})
        return Response(
            content=(existing.response_body or "").encode("utf-8"), status_code=existing.response_status or 200,
            media_type=existing.response_type, headers={"Idempotent-Replayed": "true"},
        )

    try:
        response = await call_next(request)
        chunks = [chunk async for chunk in response.body_iterator]
        payload = b"".join(c if isinstance(c, bytes) else c.encode() for c in chunks)
    except Exception:
        await run_in_threadpool(_release, scope, endpoint, key)
        raise

    await run_in_threadpool(_finish, scope, endpoint, key, response.status_code, response.media_type, payload)
    headers = {k: v for k, v in response.headers.items() if k.lower() != "content-length"}
    return Response(content=payload, status_code=response.status_code, headers=headers, media_type=response.media_type)
