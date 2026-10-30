from typing import Annotated, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError

from app.core.config import settings
from app.core.auth import TokenManager
from app.schemas.auth import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> TokenPayload:
    """
    Validate access token and return user payload.
    
    Checks:
    - Token signature and expiration
    - Token type (must be 'access')
    - Token not blacklisted
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if token.startswith("mk_"):
        return _api_key_user(token, credentials_exception)

    # Use TokenManager for comprehensive validation
    payload = TokenManager.verify_token(token, token_type="access")
    
    if not payload:
        raise credentials_exception
    
    try:
        token_data = TokenPayload(**payload)
        if not token_data.sub:
            raise credentials_exception
        return token_data
    except ValidationError:
        raise credentials_exception

def _api_key_user(token: str, exc: HTTPException) -> TokenPayload:
    """A personal API key stands in for its owner, with the same role."""
    import hashlib
    from datetime import datetime
    from uuid import UUID as _UUID

    from sqlmodel import Session, select

    from app.core.db import engine
    from app.models.phase4 import ApiKey
    from app.models.user import User

    with Session(engine) as session:
        key = session.exec(select(ApiKey).where(ApiKey.key_hash == hashlib.sha256(token.encode()).hexdigest())).first()
        if not key or key.revoked_at is not None:
            raise exc
        user = session.get(User, key.owner_id)
        if not user or not user.is_active:
            raise exc
        key.last_used_at = datetime.utcnow()
        session.add(key)
        session.commit()
        return TokenPayload(sub=str(user.id), role=user.role, family_id=str(user.family_id) if user.family_id else None, type="access")


async def get_current_traveller(current_user: Annotated[TokenPayload, Depends(get_current_user)]) -> TokenPayload:
    if current_user.role != "traveller":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user

async def get_current_agent(current_user: Annotated[TokenPayload, Depends(get_current_user)]) -> TokenPayload:
    if current_user.role != "agent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user


async def get_optional_user(token: str = Depends(OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False))) -> Optional[TokenPayload]:
    """
    Returns TokenPayload if valid token is provided, None otherwise. 
    Does NOT raise 401 - useful for optional authentication.
    """
    if not token:
        return None
    
    payload = TokenManager.verify_token(token, token_type="access")
    if not payload:
        return None
    
    try:
        return TokenPayload(**payload)
    except ValidationError:
        return None

def get_agent_runtime():
    from app.agent_runtime import AgentRuntime
    return AgentRuntime()

def get_agent_workflow_service(runtime = Depends(get_agent_runtime)):
    from app.services.agent_workflow_service import AgentWorkflowService
    return AgentWorkflowService(runtime=runtime)

async def verify_trip_access(
    trip_id: str,
    current_user: Annotated[TokenPayload, Depends(get_current_user)]
):
    """
    Verify that the current user belongs to a family associated with the requested trip.
    """
    from app.services.trip_service import TripService
    
    if current_user.role == "agent":
        from app.services.agency_service import ensure_trip_visible

        ensure_trip_visible(current_user.sub, trip_id)  # an agent sees their own agency's trips
        return TripService.get_trip(trip_id)
        
    if not current_user.family_id:
        raise HTTPException(status_code=403, detail="User not associated with a family")
        
    trip_session = TripService.get_trip(trip_id)
    if not trip_session:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    if current_user.family_id not in trip_session.family_ids:
        raise HTTPException(status_code=403, detail="Access denied: Family not part of this trip")
        
    return trip_session
