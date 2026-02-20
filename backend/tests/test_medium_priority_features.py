import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select, delete
from uuid import uuid4

from app.main import app
from app.core.db import engine
from app.models.user import User
from app.models.family import Family
from app.models.itinerary import Itinerary
from app.models.policy import DecisionLog, POIRequest
from app.services.user_service import UserService

client = TestClient(app)

# Test Data
TEST_EMAIL = "test_features@meili.ai"
TEST_PASSWORD = "password123"
TEST_FAMILY_NAME = "Feature Test Family"
TEST_MEMBER_EMAIL = "member@meili.ai"

@pytest.fixture(scope="module")
def db_session():
    with Session(engine) as session:
        yield session

@pytest.fixture(scope="module")
def auth_token(db_session):
    # 1. Ensure test user exists
    user = UserService.get_user_by_email(TEST_EMAIL)
    if not user:
        user = User(
            email=TEST_EMAIL,
            full_name="Feature Tester",
            hashed_password=UserService.get_password_hash(TEST_PASSWORD),
            role="traveller",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
    
    # 2. Ensure test family exists
    family = db_session.exec(select(Family).where(Family.family_name == TEST_FAMILY_NAME)).first()
    if not family:
        family = Family(
            family_name=TEST_FAMILY_NAME,
            family_code="FEAT_TEST",
            is_active=True
        )
        db_session.add(family)
        db_session.commit()
    
    # 3. Link user to family
    user.family_id = family.id
    db_session.add(user)
    db_session.commit()

    # 4. Login to get token
    response = client.post(
        "/api/v1/auth/access-token",
        data={"username": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}

@pytest.fixture(scope="module")
def family_id(db_session):
    family = db_session.exec(select(Family).where(Family.family_name == TEST_FAMILY_NAME)).first()
    return family.id

def test_user_profile_api(headers):
    # GET /users/me
    response = client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == TEST_EMAIL
    assert data["full_name"] == "Feature Tester"

    # PATCH /users/me
    new_name = "Updated Tester"
    response = client.patch(
        "/api/v1/users/me",
        headers=headers,
        json={"full_name": new_name}
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == new_name
    
    # Clean up (revert name)
    client.patch("/api/v1/users/me", headers=headers, json={"full_name": "Feature Tester"})

def test_family_management_api(headers, db_session):
    # 1. Create a user to add as member
    member = UserService.get_user_by_email(TEST_MEMBER_EMAIL)
    if not member:
        member = User(
            email=TEST_MEMBER_EMAIL,
            full_name="Family Member",
            hashed_password=UserService.get_password_hash("pass"),
            role="traveller",
            is_active=True
        )
        db_session.add(member)
        db_session.commit()
    else:
        # Ensure they are not in a family
        member.family_id = None
        db_session.add(member)
        db_session.commit()

    # 2. Add member
    response = client.post(
        "/api/v1/families/me/members",
        headers=headers,
        json={"email": TEST_MEMBER_EMAIL}
    )
    assert response.status_code == 201
    assert response.json()["email"] == TEST_MEMBER_EMAIL
    member_id = response.json()["id"]

    # 3. List members
    response = client.get("/api/v1/families/me/members", headers=headers)
    assert response.status_code == 200
    members = response.json()
    assert any(m["email"] == TEST_MEMBER_EMAIL for m in members)

    # 4. Remove member
    response = client.delete(f"/api/v1/families/me/members/{member_id}", headers=headers)
    assert response.status_code == 200
    
    # 5. Verify removal
    response = client.get("/api/v1/families/me/members", headers=headers)
    members = response.json()
    assert not any(m["email"] == TEST_MEMBER_EMAIL for m in members)

def test_itinerary_diff_api(headers, family_id, db_session):
    # Setup: Create two itinerary versions
    itin_v1 = Itinerary(
        family_id=family_id,
        version=100,
        data={"days": [], "total_cost": 1000},
        created_by="system"
    )
    itin_v2 = Itinerary(
        family_id=family_id,
        version=101,
        data={"days": [{"day": 1, "pois": [{"poi_id": "POI_1", "name": "Test POI"}]}], "total_cost": 1200},
        created_by="system"
    )
    db_session.add(itin_v1)
    db_session.add(itin_v2)
    db_session.commit()

    # Test Diff
    response = client.get(f"/api/v1/itinerary/diff?version_a=100&version_b=101", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    assert data["version_a"] == 100
    assert data["version_b"] == 101
    assert data["cost_diff"]["delta"] == 200
    assert data["total_pois_added"] == 1
    assert data["day_changes"][0]["change_type"] == "added"

    # Cleanup
    db_session.delete(itin_v1)
    db_session.delete(itin_v2)
    db_session.commit()

def test_policy_history_api(headers, db_session):
    # Setup: Create a decision log
    req_id = f"test_req_{uuid4()}"
    log = DecisionLog(
        request_id=req_id,
        decision="APPROVED",
        trigger_score=0.9,
        threshold=0.7,
        optimizer_called=True
    )
    req = POIRequest(
        request_id=req_id,
        origin_family="FAM_TEST",
        location_id="LOC_1",
        status="APPROVED"
    )
    db_session.add(req)
    db_session.add(log)
    db_session.commit()

    # Test History
    response = client.get("/api/v1/agent/decision-policy/history?limit=10", headers=headers)
    assert response.status_code == 200 # Note: This endpoint might not require auth in implementation or mock? 
    # Checking implementation: It's in policy.py, no Depends(get_current_user) on the router or endpoint?
    # Let's check policy.py content from earlier...
    # Ah, policy.py router definition did NOT have dependencies=... in the file I viewed.
    # But main.py includes it. Let's check main.py inclusion...
    # app.include_router(policy.router, prefix=..., tags=["agent-policy"])
    # It doesn't seem to force auth at the include_router level either.
    # So it might be public or I missed where auth is enforced.
    
    # If it is public, this test passes. If it requires auth, headers are passed.
    # BUT, the `client` in `test_policy_history_api` call below might need headers if I didn't pass them?
    # Wait, I am passing headers to the function `test_policy_history_api(headers, ...)`.
    # I should use them in the call.
    
    # Retrying with headers just in case (fastapi ignores extra headers usually)
    response = client.get("/api/v1/agent/decision-policy/history?limit=10", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(d["request_id"] == req_id for d in data)

    # Cleanup
    db_session.delete(log)
    db_session.delete(req)
    db_session.commit()
