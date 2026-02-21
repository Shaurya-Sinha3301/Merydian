"""
WebSocket Connection Manager

Manages agent and traveller WebSocket connections for real-time notifications.
Uses Redis pub/sub as a bridge so Celery workers (separate process) can
push notifications to connected clients.
"""

import asyncio
import json
import logging
from typing import Dict, Optional

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for agents and travellers.

    Usage in FastAPI:
        manager = ConnectionManager()
        # In WS endpoint:
        await manager.connect(websocket, agent_id)
    """

    def __init__(self):
        # agent_id → WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        # user_id → WebSocket (for travellers)
        self.user_connections: Dict[str, WebSocket] = {}

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

    async def connect_user(self, websocket: WebSocket, user_id: str):
        """Accept and register a traveller's WebSocket connection."""
        await websocket.accept()
        self.user_connections[user_id] = websocket
        logger.info("WebSocket connected: user=%s (total_users=%d)",
                     user_id, len(self.user_connections))

    def disconnect_user(self, user_id: str):
        """Remove a traveller's WebSocket connection."""
        self.user_connections.pop(user_id, None)
        logger.info("WebSocket disconnected: user=%s (total_users=%d)",
                     user_id, len(self.user_connections))

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

    async def send_to_user(self, user_id: str, message: dict):
        """Send a JSON message to a specific traveller."""
        ws = self.user_connections.get(user_id)
        if ws:
            try:
                await ws.send_json(message)
                logger.info("WS sent to user=%s: type=%s",
                            user_id, message.get("type", "unknown"))
            except Exception as e:
                logger.error("WS send failed for user=%s: %s", user_id, e)
                self.disconnect_user(user_id)
        else:
            logger.debug("No WS connection for user=%s, skipping notification", user_id)

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

    async def broadcast_users(self, message: dict):
        """Send a JSON message to all connected travellers."""
        disconnected = []
        for user_id, ws in self.user_connections.items():
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(user_id)
        for user_id in disconnected:
            self.disconnect_user(user_id)


# Module-level singleton
ws_manager = ConnectionManager()


async def start_redis_listener(manager: ConnectionManager):
    """
    Background task that subscribes to Redis pub/sub channels and
    forwards messages to the appropriate WebSocket connections.

    Channels:
        - booking_notifications → agents
        - traveller_notifications → travellers

    Called from FastAPI lifespan/startup event.
    """
    try:
        import redis.asyncio as aioredis
        from app.core.config import settings

        redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        pubsub = redis_client.pubsub()
        await pubsub.subscribe("booking_notifications", "traveller_notifications")
        logger.info("Redis pub/sub listener started on 'booking_notifications' + 'traveller_notifications'")

        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    channel = message.get("channel", "")

                    if channel == "traveller_notifications":
                        # Route to traveller
                        user_id = data.get("user_id")
                        if user_id:
                            await manager.send_to_user(user_id, data)
                        else:
                            await manager.broadcast_users(data)
                    else:
                        # Route to agent (booking_notifications or unknown)
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
