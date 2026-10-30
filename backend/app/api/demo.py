import json
import os
import secrets
from typing import Any, Dict, List

from fastapi import APIRouter, Header, HTTPException

from app.core.auth import TokenManager
from app.core.config import settings
from app.services.demo_seed import AGENT_EMAIL, PERSONA_BLURBS, demo_email
from app.services.demo_provision_service import DemoProvisionService
from app.services.user_service import UserService

router = APIRouter()

DEMO_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "demo_data")

AGENT_PERSONA = "Agent"


def _require_demo_enabled() -> None:
    if not settings.DEMO_ENABLED:
        raise HTTPException(status_code=404, detail="Demo sandbox is disabled.")


@router.get("/personas", summary="List demo personas")
async def list_personas() -> Dict[str, Any]:
    """Personas a visitor can enter as, including the travel-agent view."""
    _require_demo_enabled()
    personas: List[Dict[str, Any]] = [
        {"id": AGENT_PERSONA, "role": "agent", "title": "Travel Agent",
         "description": "Review AI-generated options, approve changes, watch agent jobs."},
    ]
    for pid, blurb in PERSONA_BLURBS.items():
        personas.append({"id": pid, "role": "traveller", **blurb})
    return {"personas": personas}


@router.post("/reset", summary="Reset Demo Database")
async def reset_demo_data(x_admin_key: str = Header(default="")) -> Dict[str, Any]:
    """
    Wipe and re-seed the demo data. Protected: needs the DEMO_ADMIN_KEY value in
    the X-Admin-Key header, and is disabled entirely when no key is configured.
    """
    if not settings.DEMO_ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Demo reset is disabled.")
    if not secrets.compare_digest(x_admin_key.encode(), settings.DEMO_ADMIN_KEY.encode()):
        raise HTTPException(status_code=403, detail="Invalid admin key.")
    try:
        DemoProvisionService.reset_demo()
        return {"status": "SUCCESS", "message": "Demo database reset and provisioned successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting demo database: {e}")


@router.post("/load/{persona}", summary="Enter the demo as a persona")
async def load_demo_data(persona: str) -> Dict[str, Any]:
    """
    Return a session token for one of the seeded demo accounts. Only known persona
    names are accepted, so this can never mint a token for a real user.
    """
    _require_demo_enabled()

    if persona == AGENT_PERSONA:
        email = AGENT_EMAIL
        data: Dict[str, Any] = {}
    elif persona in PERSONA_BLURBS:
        email = demo_email(persona)
        file_path = os.path.join(DEMO_DIR, f"{persona}_trip.json")
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Demo data for persona '{persona}' not found.")
        with open(file_path, "r") as f:
            data = json.load(f)
    else:
        raise HTTPException(status_code=404, detail=f"Unknown demo persona '{persona}'.")

    user = UserService.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=503, detail="Demo data has not been seeded yet.")

    token_data = TokenManager.create_tokens(
        user_id=str(user.id),
        role=user.role,
        family_id=str(user.family_id) if user.family_id else None,
    )
    return {
        "status": "SUCCESS",
        "message": f"Demo session for {persona} loaded successfully.",
        "data": data,
        "access_token": token_data["access_token"],
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "family_id": str(user.family_id) if user.family_id else None,
        },
    }
