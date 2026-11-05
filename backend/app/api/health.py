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

    # 2b. The ephemeral Redis (cache, live pub/sub). Losing it costs speed, not correctness, so it is
    # reported but does not make the service unready.
    try:
        from app.core.redis import ephemeral_url, get_ephemeral_redis, queue_url
        if ephemeral_url() != queue_url():
            health_status["redis_ephemeral"] = "connected" if await (await get_ephemeral_redis()).ping() else "disconnected"
    except Exception as e:
        health_status["redis_ephemeral"] = f"degraded: {str(e)[:80]}"
        
    # 3. Workers: every worker writes a heartbeat (app/workers/worker_heartbeat.py). Ready means at least one
    # worker is alive and one serves the optimizer queue, so plans will actually be built.
    try:
        from app.workers import worker_heartbeat

        workers = worker_heartbeat.alive()
        health_status["workers"] = [{"name": w["name"], "queues": w.get("queues", []), "age_seconds": w["age_seconds"]} for w in workers]
        serves_optimizer = any("optimizer" in (w.get("queues") or []) for w in workers)
        if workers and serves_optimizer:
            health_status["celery"] = "connected"
        elif workers:
            health_status["celery"] = "no_optimizer_worker"
            is_ready = False
        else:
            health_status["celery"] = "no_workers_available"
            is_ready = False
    except Exception as e:
        health_status["celery"] = f"error: {str(e)}"
        is_ready = False

    # 4. Language model. The key lives with the workers that call the model (least privilege: the API needs
    # none), so this comes from the optimizer workers' heartbeats; a process holding the key itself (the
    # single-container mode) also counts.
    try:
        from app.workers import worker_heartbeat

        own = worker_heartbeat._llm_status()
        try:
            reported = [x.get("llm") for x in worker_heartbeat.alive() if "optimizer" in (x.get("queues") or [])]
        except Exception:
            reported = []
        if own == "configured" or "configured" in reported:
            health_status["llm_provider"] = "configured"
        else:
            health_status["llm_provider"] = next((r for r in reported if r), own)
            is_ready = False
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
