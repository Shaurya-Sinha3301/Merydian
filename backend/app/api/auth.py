from datetime import timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core import security
from app.core.config import settings
from app.schemas.auth import Token, UserCreate
from app.services.user_service import UserService

router = APIRouter()

@router.post("/login", response_model=Token)
async def login_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    Validates username/password against database and issues JWT.
    """
    # Authenticate user against database
    user = UserService.authenticate_user(form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    additional_claims = {
        "role": user.role,
        "family_id": str(user.family_id) if user.family_id else None
    }

    access_token = security.create_access_token(
        str(user.id), expires_delta=access_token_expires, additional_claims=additional_claims
    )
    
    return Token(access_token=access_token, token_type="bearer")

@router.post("/signup", response_model=Token)
async def signup(
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
    
    user = UserService.create_user(
        email=user_in.email,
        password=user_in.password,
        role=user_in.role,
        full_name=user_in.full_name,
    )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    additional_claims = {
        "role": user.role,
        "family_id": str(user.family_id) if user.family_id else None
    }
    
    access_token = security.create_access_token(
        str(user.id), expires_delta=access_token_expires, additional_claims=additional_claims
    )
    
    return Token(access_token=access_token, token_type="bearer")
