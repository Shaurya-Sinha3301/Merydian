from typing import Optional
from pydantic import BaseModel, EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: Optional[int] = None

class TokenRefresh(BaseModel):
    refresh_token: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    family_id: Optional[str] = None
    jti: Optional[str] = None
    exp: Optional[int] = None
    type: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "traveller"
    user_type: str = "customer" # For frontend compatibility

class LogoutRequest(BaseModel):
    """Request body for logout (optional, can be empty)"""
    pass
