import asyncio
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth
from app.core.config import settings
from app.core.websocket import ws_manager, start_redis_listener

from app.core.logging import setup_logging
import time
from fastapi import Request

# Setup structured logging
setup_logging()
logger = logging.getLogger(__name__)

from app.core.rate_limit import RateLimiter

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    # Global Rate Limit: 100 requests per minute
    dependencies=[Depends(RateLimiter(times=100, seconds=60))]
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    logger.info(
        f"Request: {request.method} {request.url.path} "
        f"Status: {response.status_code} Duration: {duration:.4f}s"
    )
    return response

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# ------------------------------------------------------------------ #
#  API Routes
# ------------------------------------------------------------------ #

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])

from app.api import health
app.include_router(health.router, tags=["health"])

from app.api import events
app.include_router(events.router, prefix=f"{settings.API_V1_STR}/events", tags=["events"])

from app.api import itinerary
app.include_router(itinerary.router, prefix=f"{settings.API_V1_STR}/itinerary", tags=["itinerary"])

from app.api import agent_dashboard
app.include_router(agent_dashboard.router, prefix=f"{settings.API_V1_STR}/agent", tags=["agent"])

from app.api import bookings
app.include_router(bookings.router, prefix=f"{settings.API_V1_STR}/bookings", tags=["bookings"])

from app.api import policy
app.include_router(policy.router, prefix=f"{settings.API_V1_STR}/agent", tags=["agent-policy"])

from app.api import trips
app.include_router(trips.router, prefix=f"{settings.API_V1_STR}", tags=["trips"])

from app.api import users
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])

from app.api import families
app.include_router(families.router, prefix=f"{settings.API_V1_STR}/families", tags=["families"])


# ------------------------------------------------------------------ #
#  WebSocket Endpoint — Agent Notifications
# ------------------------------------------------------------------ #

@app.websocket("/ws/agent/{agent_id}")
async def websocket_agent_endpoint(websocket: WebSocket, agent_id: str):
    """
    WebSocket endpoint for real-time agent notifications.

    Agents connect here to receive live updates about booking status,
    step-by-step progress, and completion notifications.

    Connect: ws://localhost:8000/ws/agent/{agent_id}
    """
    await ws_manager.connect(websocket, agent_id)
    try:
        # Send welcome message
        await ws_manager.send_to_agent(agent_id, {
            "type": "connected",
            "message": f"Agent {agent_id} connected for real-time notifications",
        })

        # Keep connection alive — listen for client messages (ping/pong)
        while True:
            data = await websocket.receive_text()
            # Echo back any client messages as acknowledgment
            await ws_manager.send_to_agent(agent_id, {
                "type": "ack",
                "received": data,
            })
    except WebSocketDisconnect:
        ws_manager.disconnect(agent_id)
        logger.info("Agent %s WebSocket disconnected", agent_id)
    except Exception as e:
        ws_manager.disconnect(agent_id)
        logger.error("Agent %s WebSocket error: %s", agent_id, e)


# ------------------------------------------------------------------ #
#  WebSocket Endpoint — Traveller Notifications
# ------------------------------------------------------------------ #

@app.websocket("/ws/traveller/{user_id}")
async def websocket_traveller_endpoint(websocket: WebSocket, user_id: str):
    """
    WebSocket endpoint for real-time traveller notifications.

    Travellers connect here to receive live updates about:
    - Itinerary changes / approvals
    - Booking confirmations
    - Agent messages

    Connect: ws://localhost:8000/ws/traveller/{user_id}
    """
    await ws_manager.connect_user(websocket, user_id)
    try:
        await ws_manager.send_to_user(user_id, {
            "type": "connected",
            "message": f"Connected for real-time travel updates",
        })

        while True:
            data = await websocket.receive_text()
            await ws_manager.send_to_user(user_id, {
                "type": "ack",
                "received": data,
            })
    except WebSocketDisconnect:
        ws_manager.disconnect_user(user_id)
        logger.info("Traveller %s WebSocket disconnected", user_id)
    except Exception as e:
        ws_manager.disconnect_user(user_id)
        logger.error("Traveller %s WebSocket error: %s", user_id, e)


# ------------------------------------------------------------------ #
#  Startup / Shutdown Events
# ------------------------------------------------------------------ #

@app.on_event("startup")
async def startup_event():
    """Start Redis pub/sub listener for Celery → WebSocket bridge."""
    logger.info("Starting Redis pub/sub listener for booking notifications...")
    asyncio.create_task(start_redis_listener(ws_manager))


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up Redis connections."""
    from app.core.redis import RedisManager
    await RedisManager.close()
