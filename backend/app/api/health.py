from fastapi import APIRouter, Depends, Response
from sqlalchemy.sql import text
from sqlmodel import Session
from app.core.db import get_session
import os

router = APIRouter()

@router.get("/health/live")
async def health_live():
    """
    Liveness probe to check if the application process is running.
    """
    return {"status": "alive"}

@router.get("/health/ready")
async def health_ready(response: Response, session: Session = Depends(get_session)):
    """
    Readiness probe to verify all critical dependencies are available.
    """
    health_status = {
        "status": "ready",
        "database": "unknown",
        "redis": "unknown",
        "celery": "unknown",
        "llm_provider": "unknown",
        "travel_data_provider": "unknown"
    }
    
    is_ready = True
    
    # 1. Check Database
    try:
        session.exec(text("SELECT 1"))
        health_status["database"] = "connected"
    except Exception as e:
        health_status["database"] = f"error: {str(e)}"
        is_ready = False

    # 2. Check Redis
    try:
        from app.core.redis import get_redis
        redis_client = await get_redis()
        if await redis_client.ping():
            health_status["redis"] = "connected"
        else:
            health_status["redis"] = "disconnected"
            is_ready = False
    except Exception as e:
        health_status["redis"] = f"error: {str(e)}"
        is_ready = False
        
    # 3. Check Celery
    try:
        from app.workers.celery_app import celery_app
        # Send ping to all workers. If any responds, we consider it connected.
        # Note: control.ping() can take time if workers are busy, so set timeout.
        ping_result = celery_app.control.ping(timeout=1.0)
        if ping_result:
            health_status["celery"] = "connected"
        else:
            health_status["celery"] = "no_workers_available"
            is_ready = False
    except Exception as e:
        health_status["celery"] = f"error: {str(e)}"
        is_ready = False
        
    # 4. Check LLM Provider
    try:
        from app.core.config import settings
        key = os.environ.get("GROQ_API_KEY") or settings.GROQ_API_KEY
        if not key:
            health_status["llm_provider"] = "missing_api_key"
            is_ready = False
        elif any(marker in key.lower() for marker in ("your", "here", "xxx", "placeholder")):
            health_status["llm_provider"] = "placeholder_api_key"
            is_ready = False
        else:
            health_status["llm_provider"] = "configured"
    except Exception as e:
        health_status["llm_provider"] = f"error: {str(e)}"
        is_ready = False
        
    # 5. Check TravelDataProvider
    try:
        from app.services.travel_data_provider import TravelDataProvider
        provider = TravelDataProvider()
        provider.load_locations() # Just a light check
        health_status["travel_data_provider"] = "available"
    except Exception as e:
        health_status["travel_data_provider"] = f"error: {str(e)}"
        is_ready = False

    if not is_ready:
        health_status["status"] = "not_ready"
        response.status_code = 503
        
    return health_status
