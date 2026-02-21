"""
Token Blacklist Model

Stores revoked tokens to prevent reuse.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class TokenBlacklist(SQLModel, table=True):
    """
    Blacklist for revoked JWT tokens.
    
    Tokens are added here when:
    - User logs out
    - Password is changed
    - Account is suspended
    - Token is compromised
    """
    __tablename__ = "token_blacklist"
    
    # Primary Key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Token Info
    jti: str = Field(unique=True, index=True, max_length=255)  # JWT ID
    token_type: str = Field(max_length=20)  # 'access' or 'refresh'
    
    # User Reference
    user_id: UUID = Field(foreign_key="users.id", index=True)
    
    # Revocation Info
    revoked_at: datetime = Field(default_factory=datetime.utcnow)
    reason: Optional[str] = Field(default=None, max_length=255)
    
    # Expiration (for cleanup)
    expires_at: datetime = Field()
    
    class Config:
        json_schema_extra = {
            "example": {
                "jti": "unique-jwt-id-123",
                "token_type": "access",
                "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "reason": "user_logout"
            }
        }
