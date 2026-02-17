from typing import Any
from fastapi import APIRouter, HTTPException

from app.schemas.policy import PolicyEvaluationRequest, PolicyDecisionResponse
from app.agents.policy_agent import policy_agent
from app.models.policy import POIRequest, FamilyResponseMessage, DecisionLog
from app.services.optimizer_service import get_db_session

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
        
        # 2. Persist to database
        with get_db_session() as session:
            # Store Request
            db_request = POIRequest(
                request_id=request.request_id,
                origin_family=request.origin_family,
                location_id=request.requested_location_id,
                status=decision_response.decision
            )
            session.add(db_request)
            
            # Store Responses
            for fam_resp in request.family_responses:
                db_resp = FamilyResponseMessage(
                    request_id=request.request_id,
                    family_id=fam_resp.family_id,
                    response=fam_resp.response,
                    confidence=fam_resp.confidence
                )
                session.add(db_resp)
                
            # Store Decision Log
            db_log = DecisionLog(
                request_id=request.request_id,
                decision=decision_response.decision,
                trigger_score=decision_response.score,
                threshold=decision_response.threshold,
                optimizer_called=decision_response.optimizer_triggered
            )
            session.add(db_log)
        
        return decision_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
