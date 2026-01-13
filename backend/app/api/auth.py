from datetime import timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core import security
from app.core.config import settings
from app.schemas.auth import Token

router = APIRouter()

@router.post("/login", response_model=Token)
async def login_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    Validates username/password (mocked for now) and issues JWT.
    """
    # Verify user logic here
    # For now, we mock validation and role assignment based on username
    # In a real app, you would query the DB
    
    # Mock user data
    user = None
    if form_data.username == "traveller@example.com" and form_data.password == "password":
        user = {"id": "user_id_123", "role": "traveller", "family_id": "fam_A"}
    elif form_data.username == "agent@example.com" and form_data.password == "password":
         user = {"id": "agent_id_456", "role": "agent", "family_id": None}
    
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    additional_claims = {
        "role": user["role"],
        "family_id": user["family_id"]
    }

    access_token = security.create_access_token(
        user["id"], expires_delta=access_token_expires, additional_claims=additional_claims
    )
    
    return Token(access_token=access_token, token_type="bearer")
