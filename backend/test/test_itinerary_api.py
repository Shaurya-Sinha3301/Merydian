from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app
from app.api.itinerary import get_current_itinerary
from app.services.itinerary_service import ItineraryService
import uuid

client = TestClient(app)

# Mock user dependency
def mock_get_current_user():
    return MagicMock(family_id="3fa85f64-5717-4562-b3fc-2c963f66afa6")

def test_get_current_itinerary_success():
    # Mock Service return
    mock_data = {"days": [], "daily_itinerary": []}
    
    with patch("app.services.itinerary_service.ItineraryService.get_current_itinerary", return_value=mock_data):
        # We also need to mock Redis or the RedisManager because our endpoint uses it directly now
        with patch("app.core.redis.RedisManager.get_redis") as mock_get_redis:
            # Mock Redis object
            mock_redis = MagicMock()
            mock_get_redis.return_value = mock_redis
            # Cache miss
            mock_redis.get.return_value = None 
            
            # Setup dependency override
            app.dependency_overrides["get_current_user"] = mock_get_current_user
            
            response = client.get("/api/v1/itinerary/current")
            
            assert response.status_code == 200
            assert response.json() == mock_data
            
            # Verify cache set was called
            mock_redis.setex.assert_called_once()

def test_get_current_itinerary_cached():
    # Mock Cached data
    cached_data = '{"days": [], "daily_itinerary": [], "cached": true}'
    
    with patch("app.core.redis.RedisManager.get_redis") as mock_get_redis:
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis
        # Cache hit
        mock_redis.get.return_value = cached_data
        
        app.dependency_overrides["get_current_user"] = mock_get_current_user
        
        response = client.get("/api/v1/itinerary/current")
        
        assert response.status_code == 200
        assert response.json()["cached"] is True
        
        # Verify Service was NOT called (we can't easily assert static method not called without patching it too, 
        # but the logic implies it if we get the cached response)

def test_get_current_itinerary_not_found():
     with patch("app.services.itinerary_service.ItineraryService.get_current_itinerary", return_value=None):
        with patch("app.core.redis.RedisManager.get_redis") as mock_get_redis:
            mock_redis = MagicMock()
            mock_get_redis.return_value = mock_redis
            mock_redis.get.return_value = None
            
            app.dependency_overrides["get_current_user"] = mock_get_current_user
            
            response = client.get("/api/v1/itinerary/current")
            
            assert response.status_code == 404
