"""
Authentication Core Module

Handles token generation, validation, and session management.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from uuid import uuid4

from jose import jwt, JWTError
from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine
from app.models.token_blacklist import TokenBlacklist
from app.models.user_session import UserSession


class TokenManager:
    """Manages JWT token lifecycle including creation, validation, and revocation."""
    
    @staticmethod
    def create_tokens(
        user_id: str,
        role: str,
        family_id: Optional[str] = None,
        device_info: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Create access and refresh tokens for a user.
        
        Args:
            user_id: User UUID
            role: User role (traveller/agent)
            family_id: Optional family UUID
            device_info: Optional device information (user_agent, ip_address)
            
        Returns:
            Dictionary with access_token, refresh_token, and expiration info
        """
        # Generate unique JTIs for both tokens
        access_jti = str(uuid4())
        refresh_jti = str(uuid4())
        
        now = datetime.now(timezone.utc)
        
        # Access token (short-lived)
        access_exp = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token_data = {
            "sub": user_id,
            "role": role,
            "family_id": family_id,
            "jti": access_jti,
            "type": "access",
            "exp": access_exp,
            "iat": now,
        }
        access_token = jwt.encode(
            access_token_data,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        # Refresh token (long-lived)
        refresh_exp = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        refresh_token_data = {
            "sub": user_id,
            "jti": refresh_jti,
            "type": "refresh",
            "exp": refresh_exp,
            "iat": now,
        }
        refresh_token = jwt.encode(
            refresh_token_data,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        # Create session record
        with Session(engine) as session:
            user_session = UserSession(
                user_id=user_id,
                refresh_token_jti=refresh_jti,
                access_token_jti=access_jti,
                user_agent=device_info.get("user_agent") if device_info else None,
                ip_address=device_info.get("ip_address") if device_info else None,
                device_fingerprint=device_info.get("device_fingerprint") if device_info else None,
                expires_at=refresh_exp,
                is_active=True
            )
            session.add(user_session)
            session.commit()
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "refresh_expires_in": settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        }
    
    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
        """
        Verify and decode a JWT token.
        
        Args:
            token: JWT token string
            token_type: Expected token type ('access' or 'refresh')
            
        Returns:
            Decoded token payload or None if invalid
        """
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            
            # Verify token type
            if payload.get("type") != token_type:
                return None
            
            # Check if token is blacklisted
            jti = payload.get("jti")
            if jti and TokenManager.is_token_blacklisted(jti):
                return None
            
            # Check expiration
            exp = payload.get("exp")
            if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
                return None
            
            return payload
            
        except JWTError:
            return None
    
    @staticmethod
    def is_token_blacklisted(jti: str) -> bool:
        """Check if a token JTI is blacklisted."""
        with Session(engine) as session:
            statement = select(TokenBlacklist).where(TokenBlacklist.jti == jti)
            result = session.exec(statement).first()
            return result is not None
    
    @staticmethod
    def blacklist_token(
        jti: str,
        user_id: str,
        token_type: str,
        expires_at: datetime,
        reason: Optional[str] = None
    ):
        """Add a token to the blacklist."""
        with Session(engine) as session:
            blacklist_entry = TokenBlacklist(
                jti=jti,
                token_type=token_type,
                user_id=user_id,
                expires_at=expires_at,
                reason=reason
            )
            session.add(blacklist_entry)
            session.commit()
    
    @staticmethod
    def revoke_session(refresh_token_jti: str, reason: Optional[str] = None):
        """Revoke a user session by refresh token JTI."""
        with Session(engine) as session:
            statement = select(UserSession).where(
                UserSession.refresh_token_jti == refresh_token_jti
            )
            user_session = session.exec(statement).first()
            
            if user_session:
                user_session.is_active = False
                user_session.revoked_at = datetime.utcnow()
                user_session.revoked_reason = reason
                session.add(user_session)
                session.commit()
    
    @staticmethod
    def revoke_all_user_sessions(user_id: str, reason: Optional[str] = None):
        """Revoke all active sessions for a user."""
        with Session(engine) as session:
            statement = select(UserSession).where(
                UserSession.user_id == user_id,
                UserSession.is_active == True
            )
            sessions = session.exec(statement).all()
            
            for user_session in sessions:
                user_session.is_active = False
                user_session.revoked_at = datetime.utcnow()
                user_session.revoked_reason = reason
                session.add(user_session)
            
            session.commit()
    
    @staticmethod
    def refresh_access_token(refresh_token: str) -> Optional[Dict[str, Any]]:
        """
        Generate a new access token using a refresh token.
        
        Args:
            refresh_token: Valid refresh token
            
        Returns:
            New access token data or None if refresh token is invalid
        """
        payload = TokenManager.verify_token(refresh_token, token_type="refresh")
        if not payload:
            return None
        
        user_id = payload.get("sub")
        refresh_jti = payload.get("jti")
        
        # Verify session is still active
        with Session(engine) as session:
            statement = select(UserSession).where(
                UserSession.refresh_token_jti == refresh_jti,
                UserSession.is_active == True
            )
            user_session = session.exec(statement).first()
            
            if not user_session:
                return None
            
            # Update last activity
            user_session.last_activity = datetime.utcnow()
            session.add(user_session)
            session.commit()
        
        # Get user info to include in new access token
        from app.services.user_service import UserService
        user = UserService.get_user(user_id)
        if not user or not user.is_active:
            return None
        
        # Generate new access token
        access_jti = str(uuid4())
        now = datetime.now(timezone.utc)
        access_exp = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        access_token_data = {
            "sub": str(user.id),
            "role": user.role,
            "family_id": str(user.family_id) if user.family_id else None,
            "jti": access_jti,
            "type": "access",
            "exp": access_exp,
            "iat": now,
        }
        
        access_token = jwt.encode(
            access_token_data,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        # Update session with new access token JTI
        with Session(engine) as session:
            statement = select(UserSession).where(
                UserSession.refresh_token_jti == refresh_jti
            )
            user_session = session.exec(statement).first()
            if user_session:
                user_session.access_token_jti = access_jti
                session.add(user_session)
                session.commit()
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }
    
    @staticmethod
    def cleanup_expired_tokens():
        """Remove expired tokens from blacklist (maintenance task)."""
        with Session(engine) as session:
            now = datetime.utcnow()
            statement = select(TokenBlacklist).where(
                TokenBlacklist.expires_at < now
            )
            expired_tokens = session.exec(statement).all()
            
            for token in expired_tokens:
                session.delete(token)
            
            session.commit()
            return len(expired_tokens)
