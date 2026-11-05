"""
Two Redis roles, split by what happens when a key disappears.

  queue      Celery broker, per-trip locks, sign-in lockout and security rate-limit counters, worker
             heartbeats. Losing a key here loses a message or resets a protection, so this instance must
             never evict (and keeps best-effort persistence). Correctness still never depends on it: the
             database is the record, and lost messages are re-published from the outbox.
  ephemeral  Read cache, low-value rate-limit buckets, and pub/sub for live notifications. Losing a key
             here costs speed or one live nudge that the browser fetches on reconnect, so it may evict.

Each role has its own address (REDIS_QUEUE_URL, REDIS_EPHEMERAL_URL); either falls back to REDIS_URL, so
one instance (set to never evict) still works for local runs and the single-container showcase.
"""
from typing import Dict, Optional

import redis.asyncio as redis
from redis.asyncio.client import Redis

from app.core.config import settings


def queue_url() -> str:
    return (settings.REDIS_QUEUE_URL or settings.REDIS_URL).strip()


def ephemeral_url() -> str:
    return (settings.REDIS_EPHEMERAL_URL or settings.REDIS_URL).strip()


class RedisManager:
    _clients: Dict[str, Redis] = {}

    @classmethod
    def client(cls, url: str) -> Redis:
        if url not in cls._clients:
            cls._clients[url] = redis.from_url(url, decode_responses=True)
        return cls._clients[url]

    @classmethod
    def get_client(cls) -> Redis:
        return cls.client(queue_url())

    @classmethod
    async def close(cls) -> None:
        for c in list(cls._clients.values()):
            await c.close()
        cls._clients = {}


async def get_queue_redis() -> Redis:
    return RedisManager.client(queue_url())


async def get_ephemeral_redis() -> Redis:
    return RedisManager.client(ephemeral_url())


# Older callers ask for "the" Redis: that is the queue instance
get_redis = get_queue_redis
