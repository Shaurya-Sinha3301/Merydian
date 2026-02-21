from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Query

from app.schemas.policy import PolicyEvaluationRequest, PolicyDecisionResponse
from app.agents.policy_agent import policy_agent
from app.services.policy_service import PolicyService

import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/decision-policy/evaluate", response_model=PolicyDecisionResponse)
async def evaluate_policy(
    request: PolicyEvaluationRequest,
) -> Any:
    """
    Evaluates a user request against the policy engine.
    Calculates Instability Score and decides whether to trigger the Optimizer.
    Persists the request, family responses, and decision log to the database.
    """
    try:
        # 1. Evaluate via Agent
        decision_response = await policy_agent.evaluate(request)
        
        # 2. Persist to database (non-blocking — failures logged but don't crash)
        try:
            family_responses = [
                {
                    "family_id": fr.family_id,
                    "response": fr.response,
                    "confidence": fr.confidence,
                }
                for fr in request.family_responses
            ]
            PolicyService.save_decision(
                request_id=request.request_id,
                origin_family=request.origin_family,
                location_id=request.requested_location_id,
                decision=decision_response.decision,
                trigger_score=decision_response.score,
                threshold=decision_response.threshold,
                optimizer_called=decision_response.optimizer_triggered,
                family_responses=family_responses,
            )
        except Exception as db_err:
            logger.error(f"Failed to persist policy decision: {db_err}")
        
        return decision_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/decision-policy/history")
async def get_policy_history(
    limit: int = Query(50, ge=1, le=200, description="Max results"),
) -> Any:
    """
    Get recent policy decision history for audit and review.
    """
    return PolicyService.get_decision_history(limit=limit)


@router.get("/decision-policy/{request_id}")
async def get_policy_decision(request_id: str) -> Any:
    """Get a specific policy decision by request ID."""
    result = PolicyService.get_decision_by_request_id(request_id)
    if not result:
        raise HTTPException(status_code=404, detail="Decision not found")
    return result
