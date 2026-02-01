#!/usr/bin/env python3
"""
Quick test script for Itinerary API using requests library.
Can be run independently without FastAPI TestClient.
"""

import requests
import json
import sys

class QuickItineraryTester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.token = None
        self.headers = {}
    
    def login(self):
        """Login to get authentication token"""
        print("🔐 Attempting login...")
        
        login_data = {
            "username": "traveller@example.com",
            "password": "password"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/v1/auth/login",
                data=login_data
            )
            
            if response.status_code == 200:
                self.token = response.json()["access_token"]
                self.headers = {"Authorization": f"Bearer {self.token}"}
                print("✅ Login successful")
                return True
            else:
                print(f"❌ Login failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except requests.exceptions.ConnectionError:
            print("❌ Cannot connect to server. Is it running on http://localhost:8000?")
            return False
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def test_current_itinerary(self):
        """Test GET current itinerary"""
        print("\n📋 Testing current itinerary...")
        
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/itinerary/current",
                headers=self.headers
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Current itinerary retrieved")
                print(f"   Itinerary ID: {data.get('itinerary_id')}")
                print(f"   Status: {data.get('status')}")
                return True
            else:
                print(f"❌ Failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def test_feedback(self, rating, comment, node_id):
        """Test feedback submission"""
        print(f"\n💬 Testing feedback (rating: {rating})...")
        
        feedback_data = {
            "rating": rating,
            "comment": comment,
            "node_id": node_id
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/v1/itinerary/feedback",
                json=feedback_data,
                headers=self.headers
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Feedback submitted successfully")
                print(f"   Message: {data.get('message')}")
                print(f"   Event ID: {data.get('event_created', {}).get('event_id')}")
                return True
            else:
                print(f"❌ Failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def run_tests(self):
        """Run all tests"""
        print("🚀 Quick Itinerary API Test")
        print("=" * 40)
        
        # Check server connectivity
        try:
            response = requests.get(f"{self.base_url}/docs")
            if response.status_code != 200:
                print("⚠️  Server might not be running properly")
        except:
            print("❌ Cannot connect to server. Please start the backend server:")
            print("   cd backend && uvicorn app.main:app --reload")
            return False
        
        # Login
        if not self.login():
            return False
        
        # Test current itinerary
        success_count = 0
        total_tests = 4
        
        if self.test_current_itinerary():
            success_count += 1
        
        # Test different feedback scenarios
        test_cases = [
            (5, "Excellent service!", "poi_001"),
            (2, "Very disappointing experience", "poi_002"),
            (3, "Too rushed, needs improvement", "poi_023")
        ]
        
        for rating, comment, node_id in test_cases:
            if self.test_feedback(rating, comment, node_id):
                success_count += 1
        
        # Summary
        print("\n" + "=" * 40)
        print(f"📊 Results: {success_count}/{total_tests} tests passed")
        
        if success_count == total_tests:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed")
            return False

def main():
    """Main execution"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Quick Itinerary API Test")
    parser.add_argument("--url", default="http://localhost:8000", 
                       help="Base URL of the API server")
    
    args = parser.parse_args()
    
    tester = QuickItineraryTester(args.url)
    success = tester.run_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()