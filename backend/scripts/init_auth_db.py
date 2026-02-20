"""
Initialize Authentication Database Tables

Run this script to create all authentication-related tables.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import SQLModel
from app.core.db import engine
from app.models.user import User
from app.models.family import Family
from app.models.token_blacklist import TokenBlacklist
from app.models.user_session import UserSession

def init_db():
    """Create all database tables."""
    print("Creating authentication tables...")
    
    try:
        SQLModel.metadata.create_all(engine)
        print("✅ Successfully created all tables!")
        print("\nCreated tables:")
        print("  - users")
        print("  - families")
        print("  - token_blacklist")
        print("  - user_sessions")
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        sys.exit(1)

def create_test_users():
    """Create test users for development."""
    from app.services.user_service import UserService
    from sqlmodel import Session, select
    
    print("\nCreating test users...")
    
    with Session(engine) as session:
        # Check if test users already exist
        existing_traveller = session.exec(
            select(User).where(User.email == "traveller@test.com")
        ).first()
        
        existing_agent = session.exec(
            select(User).where(User.email == "agent@test.com")
        ).first()
        
        if existing_traveller and existing_agent:
            print("⚠️  Test users already exist. Skipping creation.")
            return
    
    try:
        # Create test traveller
        if not existing_traveller:
            traveller = UserService.create_user(
                email="traveller@test.com",
                password="testpass123",
                role="traveller",
                full_name="Test Traveller"
            )
            print(f"✅ Created test traveller: {traveller.email}")
        
        # Create test agent
        if not existing_agent:
            agent = UserService.create_user(
                email="agent@test.com",
                password="testpass123",
                role="agent",
                full_name="Test Agent"
            )
            print(f"✅ Created test agent: {agent.email}")
        
        print("\n📝 Test Credentials:")
        print("   Traveller: traveller@test.com / testpass123")
        print("   Agent: agent@test.com / testpass123")
        
    except Exception as e:
        print(f"❌ Error creating test users: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("Authentication Database Initialization")
    print("=" * 60)
    
    init_db()
    
    # Ask if user wants to create test users
    response = input("\nCreate test users for development? (y/n): ").lower()
    if response == 'y':
        create_test_users()
    
    print("\n" + "=" * 60)
    print("✅ Setup complete!")
    print("=" * 60)
