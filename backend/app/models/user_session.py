"""
User Session Model

Tracks active user sessions for security and audit purposes.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class UserSession(SQLModel, table=True):
    """
    Tracks active user sessions.
    
    Used for:
    - Session management
    - Security auditing
    - Force logout capabilities
    - Concurrent session limits
    """
    __tablename__ = "user_sessions"
    
    # Primary Key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # User Reference
    user_id: UUID = Field(foreign_key="users.id", index=True)
    
    # Session Info
    refresh_token_jti: str = Field(unique=True, index=True, max_length=255)  # JWT ID for refresh token
    access_token_jti: Optional[str] = Field(default=None, max_length=255)  # Current access token JTI
    
    # Device/Client Info
    user_agent: Optional[str] = Field(default=None, max_length=500)
    ip_address: Optional[str] = Field(default=None, max_length=45)  # IPv6 compatible
    device_fingerprint: Optional[str] = Field(default=None, max_length=255)
    
    # Session Status
    is_active: bool = Field(default=True)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    
    # Expiration
    expires_at: datetime = Field()
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    revoked_at: Optional[datetime] = Field(default=None)
    revoked_reason: Optional[str] = Field(default=None, max_length=255)
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "refresh_token_jti": "unique-jwt-id-123",
                "ip_address": "192.168.1.1",
                "is_active": True
            }
        }
