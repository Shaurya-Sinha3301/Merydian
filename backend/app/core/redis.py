import os
from typing import Optional
import redis.asyncio as redis
from redis.asyncio.client import Redis

class RedisManager:
    _instance: Optional[Redis] = None

    @classmethod
    def get_client(cls) -> Redis:
        if cls._instance is None:
            # TODO: Move URL to config/env settings
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            cls._instance = redis.from_url(redis_url, decode_responses=True)
        return cls._instance

    @classmethod
    async def close(cls):
        if cls._instance:
            await cls._instance.close()
            cls._instance = None

async def get_redis() -> Redis:
    return RedisManager.get_client()
