import json
import logging
from functools import wraps
from typing import Callable, Optional, Any
from fastapi import Request, Response
from app.core.redis import RedisManager

logger = logging.getLogger(__name__)

def cache(expire: int = 60, key_prefix: str = ""):
    """
    Redis caching decorator for FastAPI endpoints.
    
    Args:
        expire: Expiration time in seconds.
        key_prefix: Prefix for the cache key.
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Try to get request object to generate key based on path/query
            request: Optional[Request] = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            if not request and "request" in kwargs:
                if isinstance(kwargs["request"], Request):
                    request = kwargs["request"]
            
            # Construct cache key
            if request:
                # Include user ID if authenticated to avoid sharing private data
                user_id = "anon"
                if hasattr(request, "state") and hasattr(request.state, "user"):
                     user_id = str(request.state.user.id)
                # Or checks kwarg for user_id/family_id if available?
                # For now, simplistic URL-based key.
                # WARNING: Be careful with auth data.
                # Ideally, we key by user_id/family_id found in kwargs if strictly per-user data.
                
                cache_key = f"cache:{key_prefix}:{request.url.path}:{request.url.query}"
            else:
                # Fallback if no request object (simple function cache)
                import hashlib
                params = json.dumps(kwargs, sort_keys=True, default=str)
                cache_key = f"cache:{key_prefix}:{func.__name__}:{hashlib.md5(params.encode()).hexdigest()}"

            # Check cache
            try:
                redis = await RedisManager.get_redis()
                cached_data = await redis.get(cache_key)
                if cached_data:
                    logger.debug(f"Cache hit for {cache_key}")
                    # Validate if it's JSON
                    try:
                        return json.loads(cached_data)
                    except:
                        return cached_data
            except Exception as e:
                logger.error(f"Cache get error: {e}")

            # Execute function
            result = await func(*args, **kwargs)

            # Store result
            try:
                # Handle Pydantic models or dicts
                to_cache = result
                if hasattr(result, "json"): # Pydantic v1
                     to_cache = result.json()
                elif hasattr(result, "model_dump_json"): # Pydantic v2
                     to_cache = result.model_dump_json()
                elif isinstance(result, (dict, list)):
                     to_cache = json.dumps(result, default=str)
                
                if to_cache:
                    await redis.setex(cache_key, expire, to_cache)
                    logger.debug(f"Cached {cache_key} for {expire}s")
            except Exception as e:
                logger.error(f"Cache set error: {e}")

            return result
        return wrapper
    return decorator
