from datetime import timedelta, datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm

from app.core import security
from app.core.auth import TokenManager
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.schemas.auth import Token, TokenRefresh, UserCreate, LogoutRequest
from app.services.user_service import UserService
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


def get_device_info(request: Request) -> dict:
    """Extract device information from request."""
    return {
        "user_agent": request.headers.get("user-agent"),
        "ip_address": request.client.host if request.client else None,
    }


@router.post("/login", response_model=Token)
async def login_access_token(
    request: Request,
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    Validates username/password against database and issues JWT.
    """
    # Authenticate user against database
    user = UserService.authenticate_user(form_data.username, form_data.password)
    
    if not user:
        logger.warning(f"Failed login attempt for email: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        logger.warning(f"Inactive user login attempt: {user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Get device info for session tracking
    device_info = get_device_info(request)
    
    # Create tokens using TokenManager
    token_data = TokenManager.create_tokens(
        user_id=str(user.id),
        role=user.role,
        family_id=str(user.family_id) if user.family_id else None,
        device_info=device_info
    )
    
    # Set refresh token in httpOnly cookie for security
    response.set_cookie(
        key="refresh_token",
        value=token_data["refresh_token"],
        httponly=True,
        secure=True,  # Only send over HTTPS in production
        samesite="lax",
        max_age=token_data["refresh_expires_in"]
    )
    
    logger.info(f"User logged in successfully: {user.email} (role: {user.role})")
    
    return Token(
        access_token=token_data["access_token"],
        token_type=token_data["token_type"],
        expires_in=token_data["expires_in"]
    )

@router.post("/signup", response_model=Token)
async def signup(
    request: Request,
    response: Response,
    user_in: UserCreate,
) -> Any:
    """
    Create new user without the need to be logged in.
    """
    user = UserService.get_user_by_email(email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )
    
    # Validate password strength
    if len(user_in.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long"
        )
    
    user = UserService.create_user(
        email=user_in.email,
        password=user_in.password,
        role=user_in.role,
        full_name=user_in.full_name,
    )
    
    # Get device info for session tracking
    device_info = get_device_info(request)
    
    # Create tokens using TokenManager
    token_data = TokenManager.create_tokens(
        user_id=str(user.id),
        role=user.role,
        family_id=str(user.family_id) if user.family_id else None,
        device_info=device_info
    )
    
    # Set refresh token in httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=token_data["refresh_token"],
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=token_data["refresh_expires_in"]
    )
    
    logger.info(f"New user registered: {user.email} (role: {user.role})")
    
    return Token(
        access_token=token_data["access_token"],
        token_type=token_data["token_type"],
        expires_in=token_data["expires_in"]
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    request: Request,
    response: Response
) -> Any:
    """
    Refresh access token using refresh token from cookie.
    """
    refresh_token = request.cookies.get("refresh_token")
    
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate new access token
    token_data = TokenManager.refresh_access_token(refresh_token)
    
    if not token_data:
        # Invalid refresh token - clear cookie
        response.delete_cookie("refresh_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return Token(
        access_token=token_data["access_token"],
        token_type=token_data["token_type"],
        expires_in=token_data["expires_in"]
    )


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: Annotated[Any, Depends(get_current_user)]
) -> Any:
    """
    Logout user by revoking refresh token and blacklisting current access token.
    """
    refresh_token = request.cookies.get("refresh_token")
    
    if refresh_token:
        # Verify and revoke refresh token
        payload = TokenManager.verify_token(refresh_token, token_type="refresh")
        if payload:
            refresh_jti = payload.get("jti")
            TokenManager.revoke_session(refresh_jti, reason="user_logout")
            
            # Blacklist the refresh token
            TokenManager.blacklist_token(
                jti=refresh_jti,
                user_id=current_user.sub,
                token_type="refresh",
                expires_at=datetime.fromtimestamp(payload.get("exp"), tz=timezone.utc),
                reason="user_logout"
            )
    
    # Blacklist current access token
    if hasattr(current_user, 'jti') and current_user.jti:
        TokenManager.blacklist_token(
            jti=current_user.jti,
            user_id=current_user.sub,
            token_type="access",
            expires_at=datetime.fromtimestamp(current_user.exp, tz=timezone.utc),
            reason="user_logout"
        )
    
    # Clear refresh token cookie
    response.delete_cookie("refresh_token")
    
    logger.info(f"User logged out: {current_user.sub}")
    
    return {"message": "Successfully logged out"}


@router.post("/logout-all")
async def logout_all_sessions(
    response: Response,
    current_user: Annotated[Any, Depends(get_current_user)]
) -> Any:
    """
    Logout user from all devices by revoking all sessions.
    """
    # Revoke all user sessions
    TokenManager.revoke_all_user_sessions(
        user_id=current_user.sub,
        reason="user_logout_all"
    )
    
    # Clear refresh token cookie
    response.delete_cookie("refresh_token")
    
    logger.info(f"User logged out from all sessions: {current_user.sub}")
    
    return {"message": "Successfully logged out from all devices"}
