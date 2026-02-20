"""
Policy Service

Handles persistence and retrieval of PolicyAgent decisions.
"""

import logging
from typing import Optional, List
from datetime import datetime

from sqlmodel import Session, select
from app.core.db import engine
from app.models.policy import POIRequest, FamilyResponseMessage, DecisionLog

logger = logging.getLogger(__name__)


class PolicyService:
    """Service for managing policy decisions in the database."""

    @staticmethod
    def save_decision(
        request_id: str,
        origin_family: str,
        location_id: str,
        decision: str,
        trigger_score: float,
        threshold: float,
        optimizer_called: bool,
        family_responses: list = None,
    ) -> DecisionLog:
        """
        Save a complete policy decision to the database.

        Persists the POI request, family responses, and the decision log
        in a single transaction.
        """
        with Session(engine) as session:
            # Store POI request
            db_request = POIRequest(
                request_id=request_id,
                origin_family=origin_family,
                location_id=location_id,
                status=decision,
            )
            session.add(db_request)

            # Store family responses if provided
            if family_responses:
                for fam_resp in family_responses:
                    db_resp = FamilyResponseMessage(
                        request_id=request_id,
                        family_id=fam_resp.get("family_id", ""),
                        response=fam_resp.get("response", "NEUTRAL"),
                        confidence=fam_resp.get("confidence", 0.0),
                    )
                    session.add(db_resp)

            # Store decision log
            db_log = DecisionLog(
                request_id=request_id,
                decision=decision,
                trigger_score=trigger_score,
                threshold=threshold,
                optimizer_called=optimizer_called,
            )
            session.add(db_log)
            session.commit()
            session.refresh(db_log)

            logger.info(
                f"Saved policy decision: request={request_id}, "
                f"decision={decision}, score={trigger_score}"
            )
            return db_log

    @staticmethod
    def get_decision_history(limit: int = 50) -> List[dict]:
        """Get recent policy decisions with full context."""
        with Session(engine) as session:
            statement = (
                select(DecisionLog)
                .order_by(DecisionLog.timestamp.desc())
                .limit(limit)
            )
            logs = session.exec(statement).all()

            results = []
            for log in logs:
                # Get associated request info
                request = session.exec(
                    select(POIRequest).where(
                        POIRequest.request_id == log.request_id
                    )
                ).first()

                # Get associated family responses
                responses = session.exec(
                    select(FamilyResponseMessage).where(
                        FamilyResponseMessage.request_id == log.request_id
                    )
                ).all()

                results.append({
                    "id": log.id,
                    "request_id": log.request_id,
                    "decision": log.decision,
                    "trigger_score": log.trigger_score,
                    "threshold": log.threshold,
                    "optimizer_called": log.optimizer_called,
                    "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                    "origin_family": request.origin_family if request else None,
                    "location_id": request.location_id if request else None,
                    "family_responses": [
                        {
                            "family_id": r.family_id,
                            "response": r.response,
                            "confidence": r.confidence,
                        }
                        for r in responses
                    ],
                })

            return results

    @staticmethod
    def get_decision_by_request_id(request_id: str) -> Optional[dict]:
        """Get a specific decision by request ID."""
        with Session(engine) as session:
            log = session.exec(
                select(DecisionLog).where(
                    DecisionLog.request_id == request_id
                )
            ).first()

            if not log:
                return None

            request = session.exec(
                select(POIRequest).where(
                    POIRequest.request_id == request_id
                )
            ).first()

            responses = session.exec(
                select(FamilyResponseMessage).where(
                    FamilyResponseMessage.request_id == request_id
                )
            ).all()

            return {
                "id": log.id,
                "request_id": log.request_id,
                "decision": log.decision,
                "trigger_score": log.trigger_score,
                "threshold": log.threshold,
                "optimizer_called": log.optimizer_called,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "origin_family": request.origin_family if request else None,
                "location_id": request.location_id if request else None,
                "family_responses": [
                    {
                        "family_id": r.family_id,
                        "response": r.response,
                        "confidence": r.confidence,
                    }
                    for r in responses
                ],
            }
