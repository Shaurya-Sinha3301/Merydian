"""
WebSocket Connection Manager

Manages agent WebSocket connections for real-time booking notifications.
Uses Redis pub/sub as a bridge so Celery workers (separate process) can
push notifications to connected agents.
"""

import asyncio
import json
import logging
from typing import Dict, Optional

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections per agent.

    Usage in FastAPI:
        manager = ConnectionManager()
        # In WS endpoint:
        await manager.connect(websocket, agent_id)
    """

    def __init__(self):
        # agent_id → WebSocket
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, agent_id: str):
        """Accept and register an agent's WebSocket connection."""
        await websocket.accept()
        self.active_connections[agent_id] = websocket
        logger.info("WebSocket connected: agent=%s (total=%d)",
                     agent_id, len(self.active_connections))

    def disconnect(self, agent_id: str):
        """Remove an agent's WebSocket connection."""
        self.active_connections.pop(agent_id, None)
        logger.info("WebSocket disconnected: agent=%s (total=%d)",
                     agent_id, len(self.active_connections))

    async def send_to_agent(self, agent_id: str, message: dict):
        """Send a JSON message to a specific agent."""
        ws = self.active_connections.get(agent_id)
        if ws:
            try:
                await ws.send_json(message)
                logger.info("WS sent to agent=%s: type=%s",
                            agent_id, message.get("type", "unknown"))
            except Exception as e:
                logger.error("WS send failed for agent=%s: %s", agent_id, e)
                self.disconnect(agent_id)
        else:
            logger.debug("No WS connection for agent=%s, skipping notification", agent_id)

    async def broadcast(self, message: dict):
        """Send a JSON message to all connected agents."""
        disconnected = []
        for agent_id, ws in self.active_connections.items():
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(agent_id)
        for agent_id in disconnected:
            self.disconnect(agent_id)


# Module-level singleton
ws_manager = ConnectionManager()


async def start_redis_listener(manager: ConnectionManager):
    """
    Background task that subscribes to Redis pub/sub channel 'booking_notifications'
    and forwards messages to the appropriate agent WebSocket.

    Called from FastAPI lifespan/startup event.
    """
    try:
        import redis.asyncio as aioredis
        from app.core.config import settings

        redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        pubsub = redis_client.pubsub()
        await pubsub.subscribe("booking_notifications")
        logger.info("Redis pub/sub listener started on 'booking_notifications'")

        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    agent_id = data.get("agent_id")
                    if agent_id:
                        await manager.send_to_agent(agent_id, data)
                    else:
                        await manager.broadcast(data)
                except json.JSONDecodeError:
                    logger.error("Invalid JSON in Redis pub/sub: %s", message["data"])
    except ImportError:
        logger.warning("redis.asyncio not available — WS notifications from workers disabled")
    except Exception as e:
        logger.error("Redis pub/sub listener error: %s", e)
