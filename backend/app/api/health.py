from fastapi import APIRouter, Depends
from sqlalchemy.sql import text
from sqlmodel import Session
from app.core.db import get_session
from app.core.redis import RedisManager

router = APIRouter()

@router.get("/health")
async def health_check(session: Session = Depends(get_session)):
    """
    Health check endpoint to verify backend, database, and Redis connectivity.
    """
    health_status = {
        "status": "ok",
        "database": "unknown",
        "redis": "unknown"
    }
    
    # Check Database
    try:
        session.exec(text("SELECT 1"))
        health_status["database"] = "connected"
    except Exception as e:
        health_status["database"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    # Check Redis
    try:
        redis = await RedisManager.get_redis()
        if await redis.ping():
            health_status["redis"] = "connected"
        else:
            health_status["redis"] = "disconnected"
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["redis"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
        
    return health_status
