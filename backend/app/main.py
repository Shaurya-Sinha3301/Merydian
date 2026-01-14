from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
from app.api import events
app.include_router(events.router, prefix=f"{settings.API_V1_STR}/events", tags=["events"])
from app.api import itinerary
app.include_router(itinerary.router, prefix=f"{settings.API_V1_STR}/itinerary", tags=["itinerary"])
from app.api import agent_dashboard
app.include_router(agent_dashboard.router, prefix=f"{settings.API_V1_STR}/agent", tags=["agent"])
from app.api import bookings
app.include_router(bookings.router, prefix=f"{settings.API_V1_STR}/bookings", tags=["bookings"])
