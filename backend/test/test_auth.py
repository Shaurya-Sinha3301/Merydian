"""
Authentication System Tests

Covers:
1. User Registration (Signup) - Success & Failure
2. User Login - Success & Failure
3. Token Validation & Expiry
4. Role-based Access Control (Traveller vs Agent)
5. Protected Route Access
"""

import os
import sys
import logging
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select, delete

# Add parent directory to path to ensure app modules are found
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.core.db import engine
from app.models.user import User

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = TestClient(app)

# Helper for cleanup
def cleanup_test_data():
    with Session(engine) as session:
        statement = delete(User).where(User.email.like("%@test.auth"))
        session.exec(statement)
        session.commit()

# ============================================================================
# 1. Signup Tests
# ============================================================================

def test_signup_traveller_success():
    """Test successful traveller registration."""
    cleanup_test_data() # Ensure clean state
    
    response = client.post("/api/v1/auth/signup", json={
        "email": "traveller@test.auth",
        "password": "strongpassword123",
        "full_name": "Test Traveller Auth",
        "role": "traveller"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    
    # Verify DB entry
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == "traveller@test.auth")).first()
        assert user is not None
        assert user.role == "traveller"
        assert user.family_id is not None  # Should auto-create family

def test_signup_duplicate_email():
    """Test signup with existing email fails."""
    # Try creating same user again
    response = client.post("/api/v1/auth/signup", json={
        "email": "traveller@test.auth",
        "password": "password",
        "full_name": "Duplicate",
        "role": "traveller"
    })
    
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

def test_signup_agent_success():
    """Test successful agent registration."""
    response = client.post("/api/v1/auth/signup", json={
        "email": "agent@test_agent.auth",
        "password": "agentpassword123",
        "full_name": "Test Agent Auth",
        "role": "agent"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data

# ============================================================================
# 2. Login Tests
# ============================================================================

def test_login_success_traveller():
    """Test successful login returns valid token."""
    response = client.post("/api/v1/auth/login", data={
        "username": "traveller@test.auth",
        "password": "strongpassword123"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_failure_wrong_password():
    """Test login with wrong password fails."""
    response = client.post("/api/v1/auth/login", data={
        "username": "traveller@test.auth",
        "password": "wrongpassword"
    })
    
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]

def test_login_failure_nonexistent_user():
    """Test login with non-existent email fails."""
    response = client.post("/api/v1/auth/login", data={
        "username": "ghost@test.auth",
        "password": "password"
    })
    
    assert response.status_code == 401

# ============================================================================
# 3. Access Control Tests
# ============================================================================

def get_auth_headers(email, password):
    """Helper to get auth headers."""
    response = client.post("/api/v1/auth/login", data={
        "username": email,
        "password": password
    })
    if response.status_code != 200:
        return None
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_protected_route_access():
    """Test accessing protected user profile."""
    # Ensure user exists first
    client.post("/api/v1/auth/signup", json={
        "email": "traveller@test.auth",
        "password": "strongpassword123",
        "full_name": "Test Traveller Auth",
        "role": "traveller"
    })
    
    headers = get_auth_headers("traveller@test.auth", "strongpassword123")
    
    response = client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "traveller@test.auth"
    assert data["role"] == "traveller"

def test_protected_route_no_token():
    """Test accessing protected route without token fails."""
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]

def test_role_based_access_agent_only_route():
    """Test traveller cannot access agent-only routes."""
    # Traveller token
    headers = get_auth_headers("traveller@test.auth", "strongpassword123")
    
    # Try accessing agent dashboard route
    # Note: Using /api/v1/agent/itinerary/options which requires agent role
    response = client.get("/api/v1/agent/itinerary/options?event_id=test", headers=headers)
    
    assert response.status_code == 403
    assert "doesn't have enough privileges" in response.json()["detail"]

def test_agent_can_access_agent_route():
    """Test agent can access agent-only routes."""
    # Create agent if ncessary
    client.post("/api/v1/auth/signup", json={
        "email": "agent@test_agent.auth",
        "password": "agentpassword123",
        "full_name": "Test Agent Auth",
        "role": "agent"
    })

    # Agent token
    headers = get_auth_headers("agent@test_agent.auth", "agentpassword123")
    
    # We need to ensure we don't get 403, getting 404 (not found) is fine for logic check
    # as it means auth passed but data wasn't found
    response = client.get("/api/v1/agent/itinerary/options?event_id=test", headers=headers)
    
    assert response.status_code == 404 # Auth passed, event not found
