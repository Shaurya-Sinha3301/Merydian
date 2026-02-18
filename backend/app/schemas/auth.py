from typing import Optional
from pydantic import BaseModel, EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    family_id: Optional[str] = None
    exp: Optional[int] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "traveller"
    user_type: str = "customer" # For frontend compatibility
