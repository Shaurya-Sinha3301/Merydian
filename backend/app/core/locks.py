"""
A small cross-process lock on Redis, used so two workers do not replan the same trip at once.

The lock is a key that exists only while someone holds it. It carries a random token so only the
holder can release it, and it expires by itself so a crashed worker can never block a trip for good.
"""
import logging
import os
import uuid
from contextlib import contextmanager
from typing import Iterator, Optional

import redis

logger = logging.getLogger(__name__)

# Release only if the key still holds our token (compare-and-delete in one step).
_RELEASE = """
if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
end
return 0
"""

_client: Optional[redis.Redis] = None


def _redis() -> redis.Redis:
    global _client
    if _client is None:
        from app.core.redis import queue_url

        # Locks live on the queue Redis, which never evicts: an evicted lock would let two holders in
        _client = redis.from_url(queue_url(), decode_responses=True)
    return _client


def acquire(name: str, ttl_seconds: int) -> Optional[str]:
    """Try to take the lock. Returns the holder's token, or None if someone else has it.

    If Redis is unreachable the lock is skipped (a token is still returned) so a Redis blip
    does not stop all replanning; the database row lock remains as the backstop.
    """
    token = uuid.uuid4().hex
    try:
        if _redis().set(f"lock:{name}", token, nx=True, ex=ttl_seconds):
            return token
        return None
    except redis.RedisError as exc:
        logger.warning("Lock %s skipped, Redis unavailable: %s", name, exc)
        return token


def release(name: str, token: str) -> None:
    try:
        _redis().eval(_RELEASE, 1, f"lock:{name}", token)
    except redis.RedisError as exc:
        logger.warning("Lock %s not released cleanly, it will expire on its own: %s", name, exc)


@contextmanager
def held(name: str, ttl_seconds: int) -> Iterator[Optional[str]]:
    """Context manager: yields the token if the lock was taken, None if it is busy."""
    token = acquire(name, ttl_seconds)
    try:
        yield token
    finally:
        if token:
            release(name, token)
