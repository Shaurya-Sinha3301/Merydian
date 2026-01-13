from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.auth import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> TokenPayload:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_data = TokenPayload(**payload)
        return token_data
    except (JWTError, ValidationError):
        raise credentials_exception

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
