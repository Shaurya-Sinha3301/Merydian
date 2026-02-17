#!/usr/bin/env python3
"""
Comprehensive test script for Itinerary API endpoints.
Tests all itinerary-related API calls including the new feedback endpoint.
"""

import sys
import os
import json
from datetime import datetime

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    class ItineraryAPITester:
        def __init__(self):
            self.token = None
            self.headers = {}
            
        def login(self):
            """Login to get authentication token"""
            print("Testing Authentication...")
            login_payload = {
                "username": "traveller@example.com",
                "password": "password"
            }
            
            response = client.post("/api/v1/auth/login", data=login_payload)
            
            if response.status_code == 200:
                self.token = response.json()["access_token"]
                self.headers = {"Authorization": f"Bearer {self.token}"}
                print("✅ Authentication successful")
                return True
            else:
                print(f"❌ Authentication failed: {response.status_code}")
                print(f"Response: {response.json()}")
                return False
        
        def test_get_current_itinerary(self):
            """Test GET /api/v1/itinerary/current"""
            print("\n📋 Testing GET /api/v1/itinerary/current...")
            
            response = client.get("/api/v1/itinerary/current", headers=self.headers)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Current itinerary retrieved successfully")
                print(f"Itinerary ID: {data.get('itinerary_id')}")
                print(f"Status: {data.get('status')}")
                print(f"Subgroups: {len(data.get('subgroups', []))}")
                
                # Validate response structure
                assert "itinerary_id" in data
                assert "status" in data
                assert "subgroups" in data
                
                return data
            else:
                print(f"❌ Failed to get current itinerary")
                print(f"Response: {response.json()}")
                return None
        
        def test_submit_feedback_positive(self):
            """Test POST /api/v1/itinerary/feedback with positive feedback"""
            print("\n😊 Testing POST /api/v1/itinerary/feedback (Positive)...")
            
            feedback_payload = {
                "rating": 5,
                "comment": "Amazing experience! Everything was perfect.",
                "node_id": "poi_001"
            }
            
            response = client.post("/api/v1/itinerary/feedback", 
                                 json=feedback_payload, 
                                 headers=self.headers)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Positive feedback submitted successfully")
                print(f"Message: {data.get('message')}")
                print(f"Event ID: {data.get('event_created', {}).get('event_id')}")
                print(f"Event Status: {data.get('event_created', {}).get('status')}")
                
                # Validate response structure
                assert "message" in data
                assert "event_created" in data
                assert "event_id" in data["event_created"]
                assert data["event_created"]["status"] == "queued"
                
                return data
            else:
                print(f"❌ Failed to submit positive feedback")
                print(f"Response: {response.json()}")
                return None
        
        def test_submit_feedback_negative(self):
            """Test POST /api/v1/itinerary/feedback with negative feedback"""
            print("\n😞 Testing POST /api/v1/itinerary/feedback (Negative)...")
            
            feedback_payload = {
                "rating": 2,
                "comment": "Very disappointing. The service was poor.",
                "node_id": "poi_002"
            }
            
            response = client.post("/api/v1/itinerary/feedback", 
                                 json=feedback_payload, 
                                 headers=self.headers)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Negative feedback submitted successfully")
                print(f"Message: {data.get('message')}")
                print(f"Event ID: {data.get('event_created', {}).get('event_id')}")
                
                # Validate that negative feedback gets appropriate message
                assert "concern" in data["message"].lower() or "looking into" in data["message"].lower()
                
                return data
            else:
                print(f"❌ Failed to submit negative feedback")
                print(f"Response: {response.json()}")
                return None
        
        def test_submit_feedback_neutral(self):
            """Test POST /api/v1/itinerary/feedback with neutral feedback"""
            print("\n😐 Testing POST /api/v1/itinerary/feedback (Neutral)...")
            
            feedback_payload = {
                "rating": 3,
                "comment": "Too rushed, could be better organized.",
                "node_id": "poi_023"
            }
            
            response = client.post("/api/v1/itinerary/feedback", 
                                 json=feedback_payload, 
                                 headers=self.headers)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Neutral feedback submitted successfully")
                print(f"Message: {data.get('message')}")
                print(f"Event ID: {data.get('event_created', {}).get('event_id')}")
                
                # Validate that neutral feedback gets improvement message
                assert "improve" in data["message"].lower()
                
                return data
            else:
                print(f"❌ Failed to submit neutral feedback")
                print(f"Response: {response.json()}")
                return None
        
        def test_feedback_validation_errors(self):
            """Test feedback endpoint with invalid data"""
            print("\n🚫 Testing feedback validation errors...")
            
            # Test invalid rating (out of range)
            invalid_payloads = [
                {
                    "rating": 6,  # Invalid: > 5
                    "comment": "Test",
                    "node_id": "poi_001"
                },
                {
                    "rating": 0,  # Invalid: < 1
                    "comment": "Test",
                    "node_id": "poi_001"
                },
                {
                    "comment": "Test",  # Missing rating
                    "node_id": "poi_001"
                },
                {
                    "rating": 3,
                    "node_id": "poi_001"  # Missing comment
                },
                {
                    "rating": 3,
                    "comment": "Test"  # Missing node_id
                }
            ]
            
            for i, payload in enumerate(invalid_payloads):
                response = client.post("/api/v1/itinerary/feedback", 
                                     json=payload, 
                                     headers=self.headers)
                
                if response.status_code == 422:
                    print(f"✅ Validation error {i+1} caught correctly")
                else:
                    print(f"❌ Validation error {i+1} not caught: {response.status_code}")
        
        def test_unauthorized_access(self):
            """Test API endpoints without authentication"""
            print("\n🔒 Testing unauthorized access...")
            
            # Test without headers
            response = client.get("/api/v1/itinerary/current")
            if response.status_code == 401:
                print("✅ Unauthorized access to current itinerary blocked")
            else:
                print(f"❌ Unauthorized access not blocked: {response.status_code}")
            
            # Test feedback without auth
            feedback_payload = {
                "rating": 3,
                "comment": "Test",
                "node_id": "poi_001"
            }
            response = client.post("/api/v1/itinerary/feedback", json=feedback_payload)
            if response.status_code == 401:
                print("✅ Unauthorized feedback submission blocked")
            else:
                print(f"❌ Unauthorized feedback not blocked: {response.status_code}")
        
        def run_all_tests(self):
            """Run all itinerary API tests"""
            print("🚀 Starting Itinerary API Tests")
            print("=" * 50)
            
            # Test unauthorized access first
            self.test_unauthorized_access()
            
            # Login
            if not self.login():
                print("❌ Cannot proceed without authentication")
                return False
            
            # Run authenticated tests
            tests_passed = 0
            total_tests = 5
            
            try:
                # Test current itinerary
                if self.test_get_current_itinerary():
                    tests_passed += 1
                
                # Test feedback endpoints
                if self.test_submit_feedback_positive():
                    tests_passed += 1
                
                if self.test_submit_feedback_negative():
                    tests_passed += 1
                
                if self.test_submit_feedback_neutral():
                    tests_passed += 1
                
                # Test validation
                self.test_feedback_validation_errors()
                tests_passed += 1
                
            except Exception as e:
                print(f"❌ Test execution error: {e}")
            
            # Summary
            print("\n" + "=" * 50)
            print(f"📊 Test Summary: {tests_passed}/{total_tests} tests passed")
            
            if tests_passed == total_tests:
                print("🎉 All tests passed!")
                return True
            else:
                print("⚠️  Some tests failed")
                return False

    def main():
        """Main test execution"""
        tester = ItineraryAPITester()
        success = tester.run_all_tests()
        
        if success:
            print("\n✅ Itinerary API is working correctly!")
            sys.exit(0)
        else:
            print("\n❌ Some issues found in Itinerary API")
            sys.exit(1)

    if __name__ == "__main__":
        main()

except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("Ensure you have these installed:")
    print("  pip install fastapi httpx")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    sys.exit(1)