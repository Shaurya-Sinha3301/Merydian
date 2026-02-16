from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Session, select
from app.core.db import engine
from app.models.user import User

# Use pbkdf2_sha256 for better compatibility
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


class UserService:
    """Service for managing users."""
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)
    
    @staticmethod
    def get_user_by_email(email: str) -> Optional[User]:
        """Get a user by email."""
        with Session(engine) as session:
            statement = select(User).where(User.email == email)
            return session.exec(statement).first()
    
    @staticmethod
    def get_user(user_id: UUID) -> Optional[User]:
        """Get a user by ID."""
        with Session(engine) as session:
            return session.get(User, user_id)
    
    @staticmethod
    def create_user(
        email: str, 
        password: str, 
        role: str,
        full_name: Optional[str] = None,
        family_id: Optional[UUID] = None
    ) -> User:
        """
        Create a new user.
        
        Args:
            email: User email (unique)
            password: Plain text password (will be hashed)
            role: 'traveller' or 'agent'
            full_name: Optional full name
            family_id: Optional family association
            
        Returns:
            Created User object
        """
        from app.models.family import Family
        
        with Session(engine) as session:
            # Auto-create family if not provided and user is a traveller/organizer
            if not family_id and role == "traveller":
                # Create a new family for this user
                family_name = f"{full_name}'s Family" if full_name else "My Family"
                family = Family(
                    family_name=family_name,
                    family_code=str(uuid4())[:8].upper() # Generate a simple code
                )
                session.add(family)
                session.commit()
                session.refresh(family)
                family_id = family.id
            
            hashed_password = UserService.get_password_hash(password)
            
            user = User(
                email=email,
                hashed_password=hashed_password,
                role=role,
                full_name=full_name,
                family_id=family_id,
                is_active=True
            )
            
            session.add(user)
            session.commit()
            session.refresh(user)
            
            return user
    
    @staticmethod
    def authenticate_user(email: str, password: str) -> Optional[User]:
        """
        Authenticate a user by email and password.
        
        Args:
            email: User email
            password: Plain text password
            
        Returns:
            User object if authentication successful, None otherwise
        """
        user = UserService.get_user_by_email(email)
        if not user:
            return None
        if not UserService.verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        return user
