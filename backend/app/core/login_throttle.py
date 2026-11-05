"""
Sign-in protection that follows the account, not the visitor's address.

After LOGIN_MAX_FAILURES wrong passwords for one email within LOGIN_LOCK_SECONDS, further attempts for
that email are refused until the window passes. The count is kept per submitted email whether or not
the account exists, so the response never reveals which emails are registered. A correct password
clears the count. If Redis is unreachable the check is skipped (sign-in stays available) and logged.
"""
import hashlib
import logging

from fastapi import HTTPException, status

from app.core.config import settings
# Lockout counters live on the queue Redis: on an evicting instance a flood could push them out
from app.core.redis import get_queue_redis as get_redis

logger = logging.getLogger(__name__)


def _key(email: str) -> str:
    return "login_fail:" + hashlib.sha256(email.strip().lower().encode()).hexdigest()[:24]


async def check(email: str) -> None:
    """Refuse the attempt if this account is currently locked."""
    try:
        redis = await get_redis()
        count = await redis.get(_key(email))
        if count is not None and int(count) >= settings.LOGIN_MAX_FAILURES:
            wait = max(await redis.ttl(_key(email)), 1)
            logger.warning("Sign-in refused, account locked for %s more seconds", wait)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed attempts. Try again in {max(wait // 60, 1)} minute(s), or reset your password.",
                headers={"Retry-After": str(wait)},
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Login throttle skipped, Redis unavailable: %s", exc)


async def record_failure(email: str) -> None:
    try:
        redis = await get_redis()
        key = _key(email)
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, settings.LOGIN_LOCK_SECONDS)
    except Exception as exc:
        logger.warning("Login failure not counted, Redis unavailable: %s", exc)


async def clear(email: str) -> None:
    try:
        redis = await get_redis()
        await redis.delete(_key(email))
    except Exception:
        pass
