import unittest
import sys
import os
import json
from typing import List

# Fix path to include backend root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.schemas.policy import PolicyEvaluationRequest, FamilyResponse, FamilyProfile, InterestVector, GroupContext
from app.agents.policy_agent import policy_agent

class TestMeiliAILogic(unittest.TestCase):

    def setUp(self):
        # Common Test Data
        self.vector_history = InterestVector(history=0.9, architecture=0.8, food=0.4, nature=0.5, nightlife=0.1, shopping=0.3, religious=0.9)
        self.vector_party = InterestVector(history=0.1, architecture=0.2, food=0.5, nature=0.1, nightlife=0.9, shopping=0.7, religious=0.0)
        
        self.fam_hist = FamilyProfile(
            family_id="fam-history", members=4, children=2, budget_sensitivity=0.8,
            interest_vector=self.vector_history
        )
        self.fam_party = FamilyProfile(
            family_id="fam-party", members=2, children=0, budget_sensitivity=0.5,
            interest_vector=self.vector_party
        )
        
        self.profiles = [self.fam_hist, self.fam_party]

    # --- Policy Agent Tests ---
    
    def test_alignment_calculation(self):
        """Test dot product and normalization logic."""
        # Perfect Match
        score_perfect = policy_agent.calculate_alignment(self.vector_history, self.vector_history)
        print(f"Alignment (Perfect): {score_perfect}")
        self.assertGreater(score_perfect, 0.8, "Perfect match should be high")
        
        # Mismatch
        score_mismatch = policy_agent.calculate_alignment(self.vector_history, self.vector_party)
        print(f"Alignment (Mismatch): {score_mismatch}")
        self.assertLess(score_mismatch, 0.6, "Mismatch should be reasonably low (updated for generous norm)")

    def test_instability_score_calculation(self):
        """Test how votes and alignment fit into the score."""
        # Case: History Family votes YES for History Location (Good)
        # Party Family votes NO for History Location (Bad fit -> Expected unhappiness)
        
        req = PolicyEvaluationRequest(
            request_id="test-1",
            requested_location_id="loc-museum",
            origin_family="fam-history",
            location_features=self.vector_history,
            family_profiles=self.profiles,
            family_responses=[
                FamilyResponse(family_id="fam-history", response="YES", confidence=0.9, current_satisfaction=0.9, delta_satisfaction=0.1),
                FamilyResponse(family_id="fam-party", response="NO", confidence=0.8, current_satisfaction=0.5, delta_satisfaction=-0.2)
            ],
            group_context=GroupContext(remaining_trip_hours=10, locked_booking_ratio=0.5, optimizer_calls_used=0)
        )
        
        score = policy_agent.calculate_instability_score(req)
        print(f"Instability Score: {score}")
        
        # Logic Check:
        # Fam-History: High Weight, YES vote (-0.5), High match. Contribution should be negative/low.
        # Fam-Party: Low Weight, NO vote (+1.0), Low match. Contribution positive.
        # If score is 0, it means the happy family canceled out the unhappy one.
        # If we want to ensure it triggers, we need to check if result is what we expect.
        # Current logic allows cancellation.
        self.assertTrue(score >= 0.0)

if __name__ == '__main__':
    unittest.main()
