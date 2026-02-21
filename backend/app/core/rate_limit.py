from fastapi import HTTPException, Request, Depends
from app.core.redis import RedisManager
import time
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    """
    Redis-based Rate Limiter.
    """
    def __init__(self, times: int = 100, seconds: int = 60):
        self.times = times
        self.seconds = seconds

    async def __call__(self, request: Request):
        try:
            redis = await RedisManager.get_redis()
            
            # Use IP as identifier
            client_ip = request.client.host if request.client else "unknown"
            key = f"rate_limit:{client_ip}:{request.url.path}"
            
            # Increment request count
            current_requests = await redis.incr(key)
            
            # Set expiry on first request
            if current_requests == 1:
                await redis.expire(key, self.seconds)
            
            if current_requests > self.times:
                logger.warning(f"Rate limit exceeded for {client_ip} on {request.url.path}")
                raise HTTPException(
                    status_code=429,
                    detail="Too many requests. Please try again later."
                )
                
        except HTTPException:
            raise
        except Exception as e:
            # CMS/Fail-open strategy: Log error but allow request if Redis fails
            logger.error(f"Rate limiter error: {e}")
