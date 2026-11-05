"""
Request limits per route class, keyed by the visitor's real address (see app/core/client_ip.py).

Limits are counted in Redis (a fixed window per key). If Redis is unreachable:
  * sign-in, sign-up, forgot-password and reset fall back to a counter held in this process's memory, so
    they are never left wide open. Each process counts separately, so the fallback is looser than Redis,
    but it is never unlimited.
  * every other route fails open and stays usable, and the failure is logged.
"""
import logging
import threading
import time
from typing import Dict, Optional, Tuple

from fastapi import HTTPException, Request

from app.core.client_ip import client_ip
from app.core.redis import ephemeral_available, ephemeral_call, get_ephemeral_redis, get_queue_redis

logger = logging.getLogger(__name__)

# (method, path prefix, requests allowed, window in seconds, fall back to memory if Redis is down)
RULES = (
    ("POST", "/api/v1/auth/login", 10, 60, True),
    ("POST", "/api/v1/auth/signup", 5, 600, True),
    ("POST", "/api/v1/auth/forgot", 5, 600, True),
    ("POST", "/api/v1/auth/reset", 10, 600, True),
    # Anything that starts a job or calls the language model
    ("POST", "/api/v1/itinerary/feedback", 20, 60, False),
    ("POST", "/api/v1/trips/initialize", 20, 60, False),
)
DEFAULT_LIMIT, DEFAULT_WINDOW = 120, 60


class _MemoryCounter:
    """Fixed-window counts for when Redis is unreachable. Per process, thread-safe, self-pruning."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._counts: Dict[str, Tuple[float, int]] = {}

    def hit(self, key: str, window: int) -> int:
        now = time.time()
        with self._lock:
            start, n = self._counts.get(key, (now, 0))
            if now - start >= window:
                start, n = now, 0
            n += 1
            self._counts[key] = (start, n)
            if len(self._counts) > 10000:
                self._counts = {k: v for k, v in self._counts.items() if now - v[0] < 3600}
            return n


_memory = _MemoryCounter()


async def allow(key: str, limit: int, window: int, fallback: bool) -> bool:
    """Count one request against key. True if it is within the limit."""
    try:
        # Security limits (the ones with a fallback) count on the queue Redis, which never evicts; low-value
        # buckets count on the ephemeral one, where losing a count only resets a minute's window
        if fallback:
            redis = await get_queue_redis()
            n = await redis.incr(f"rate_limit:{key}")
            if n == 1:
                await redis.expire(f"rate_limit:{key}", window)
            return n <= limit
        if not ephemeral_available():
            return True  # the ephemeral instance failed moments ago: skip the count rather than stall the request
        redis = await get_ephemeral_redis()
        n = await ephemeral_call(redis.incr(f"rate_limit:{key}"))
        if n == 1:
            await ephemeral_call(redis.expire(f"rate_limit:{key}", window))
        return n <= limit
    except Exception as exc:
        if fallback:
            logger.warning("Rate limiter using in-memory fallback, Redis unavailable: %s", exc)
            return _memory.hit(key, window) <= limit
        logger.error("Rate limiter skipped (fails open), Redis unavailable: %s", exc)
        return True


def _rule_for(method: str, path: str) -> Optional[tuple]:
    for rule in RULES:
        if method == rule[0] and path.startswith(rule[1]):
            return rule
    return None


class RateLimiter:
    async def __call__(self, request: Request) -> None:
        ip = client_ip(request)
        path = request.url.path
        rule = _rule_for(request.method, path)
        if rule:
            _method, prefix, limit, window, fallback = rule
            key = f"{prefix}:{ip}"
        else:
            limit, window, fallback = DEFAULT_LIMIT, DEFAULT_WINDOW, False
            key = f"{path}:{ip}"
        if not await allow(key, limit, window, fallback):
            logger.warning("Rate limit exceeded for %s on %s", ip, path)
            raise HTTPException(status_code=429, detail="Too many requests. Please try again later.",
                                headers={"Retry-After": str(window)})
