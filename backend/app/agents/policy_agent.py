import logging
import os
import json
from typing import List, Dict, Any, Optional

from app.schemas.policy import (
    PolicyEvaluationRequest, 
    PolicyDecisionResponse, 
    FamilyResponse
)

# Setup logging
logger = logging.getLogger(__name__)

# Constants (Policy Configuration)
POLICY_THRESHOLD = 0.5  # Example threshold
MAX_OPTIMIZER_CALLS = 5
ALPHA = 1.0  # Weight for Response Value
BETA = 1.0   # Weight for Satisfaction Drop
GAMMA = 1.0  # Weight for Confidence

class PolicyAgent:
    """
    Agent responsible for evaluating instability scores and enforcing policy.
    Uses family profiles and location features to calculate dynamic alignment.
    """

    def __init__(self):
        # No more static file loading
        pass

    def calculate_alignment(self, family_vector, location_vector) -> float:
        """
        Calculates dot product of interest vectors.
        Assumes normalized vectors (0-1), roughly.
        """
        dot_product = (
            family_vector.history * location_vector.history +
            family_vector.architecture * location_vector.architecture +
            family_vector.food * location_vector.food +
            family_vector.nature * location_vector.nature +
            family_vector.nightlife * location_vector.nightlife +
            family_vector.shopping * location_vector.shopping +
            family_vector.religious * location_vector.religious
        )
        # Normalize roughly by number of dimensions or just clamp?
        # For now, let's treat it as a raw alignment score. 
        # A mix of 1.0s would be 7.0. Let's normalize by 7 to keep it 0-1
        return min(dot_product / 1.5, 1.0) # Heuristic normalization

    def calculate_instability_score(self, request: PolicyEvaluationRequest) -> float:
        """
        Computes the Instability / Trigger Score.
        Score = Sum( w_f * ( alpha*R_f + beta*dS_f + gamma*C_f + delta*AlignmentMismatch ) )
        """
        total_score = 0.0
        
        # Create a map for easy lookup
        profiles_map = {p.family_id: p for p in request.family_profiles}

        for resp in request.family_responses:
            profile = profiles_map.get(resp.family_id)
            if not profile:
                logger.warning(f"Profile missing for {resp.family_id}, using defaults.")
                w_f = 1.0
                alignment = 0.5
            else:
                # Dynamic Weight: members * budget_sensitivity
                # We normalize it so it doesn't explode
                w_f = profile.members * (1.0 + profile.budget_sensitivity)

                # Alignment Score (Higher is better)
                alignment = self.calculate_alignment(profile.interest_vector, request.location_features)

            # Map Response to Value (R_f)
            # NO = high instability contribution
            r_val = 0.0
            if resp.response == "NO":
                r_val = 1.0
            elif resp.response == "YES":
                r_val = -0.5 # Reduces instability
            
            # Logic: 
            # If Alignment is HIGH and they vote NO -> HIGH Instability (Surprising dissatisfaction)
            # If Alignment is LOW and they vote NO -> Expected, lower instability contribution?
            # actually, let's stick to the prompt's implication: 
            # "incorporate these vectors... to calculate that threshold"
            
            # Simplified Instability Term:
            # Instability increases if:
            # - They vote NO
            # - Satisfaction drops
            # - Alignment is LOW (The location simply doesn't fit them)
            
            alignment_mismatch = 1.0 - alignment
            
            term = (ALPHA * r_val) + (BETA * -resp.delta_satisfaction) + (0.5 * alignment_mismatch)
            
            weighted_term = w_f * term
            total_score += weighted_term
            
        return max(total_score, 0.0)

    async def evaluate(self, request: PolicyEvaluationRequest) -> PolicyDecisionResponse:
        """
        Main evaluation logic.
        """
        score = self.calculate_instability_score(request)
        
        decision = "MANUAL_REVIEW"
        optimizer_triggered = False
        explanation = f"Score {score:.2f} below threshold {POLICY_THRESHOLD}"

        # Policy Logic
        if score >= POLICY_THRESHOLD:
            if request.group_context.optimizer_calls_used < MAX_OPTIMIZER_CALLS:
                decision = "OPTIMIZE"
                optimizer_triggered = True
                explanation = f"Instability Score {score:.2f} >= Threshold. Optimizer triggered."
            else:
                decision = "MANUAL_REVIEW" 
                explanation = "Score met threshold, but optimizer quota exceeded."
        
        return PolicyDecisionResponse(
            request_id=request.request_id,
            decision=decision,
            score=score,
            threshold=POLICY_THRESHOLD,
            optimizer_triggered=optimizer_triggered,
            explanation=explanation
        )

policy_agent = PolicyAgent()

