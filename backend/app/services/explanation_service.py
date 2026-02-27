"""
ExplanationService — DB operations for ItineraryExplanation records.

Provides:
  save_explanations()  — bulk-insert explanation rows after FeedbackProcessor runs
  get_explanations()   — retrieve stored explanations for an itinerary
  get_trip_explanations() — all explanations for a trip
"""

import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlmodel import Session, select

from app.core.db import engine
from app.models.itinerary_explanation import ItineraryExplanation

logger = logging.getLogger(__name__)


class ExplanationService:
    """Persist and retrieve per-POI itinerary change explanations."""

    @staticmethod
    def save_explanations(
        trip_id: str,
        family_id: UUID,
        itinerary_id: UUID,
        prev_itinerary_id: Optional[UUID],
        explanations: List[Dict[str, Any]],
        trigger_message: Optional[str] = None,
    ) -> List[UUID]:
        """
        Bulk-insert explanation rows from FeedbackProcessor output.

        Args:
            trip_id:            Trip identifier
            family_id:          The family these explanations belong to
            itinerary_id:       The NEW itinerary version UUID
            prev_itinerary_id:  The OLD itinerary version UUID (may be None for initial)
            explanations:       List of dicts from FeedbackProcessor.process_feedback()
                                Each dict has: family_id, day, poi_id, poi_name,
                                change_type, causal_tags, cost_delta,
                                satisfaction_delta, llm_explanation, raw_payload
            trigger_message:    User feedback message that triggered this

        Returns:
            List of created ItineraryExplanation UUIDs
        """
        if not explanations:
            return []

        created_ids: List[UUID] = []

        with Session(engine) as session:
            for exp in explanations:
                # Use per-record family_id if pipeline returned one, else the param
                fid_str = exp.get("family_id")
                try:
                    fid = UUID(str(fid_str)) if fid_str else family_id
                except (ValueError, AttributeError):
                    fid = family_id

                record = ItineraryExplanation(
                    trip_id=trip_id,
                    family_id=fid,
                    itinerary_id=itinerary_id,
                    prev_itinerary_id=prev_itinerary_id,
                    day_number=int(exp.get("day") or 0),
                    poi_id=exp.get("poi_id"),
                    poi_name=exp.get("poi_name"),
                    change_type=str(exp.get("change_type", "UNKNOWN")),
                    causal_tags=exp.get("causal_tags") or [],
                    cost_delta=exp.get("cost_delta") or {},
                    satisfaction_delta=exp.get("satisfaction_delta") or {},
                    llm_explanation=exp.get("llm_explanation"),
                    raw_payload=exp.get("raw_payload"),
                    trigger_message=trigger_message,
                )
                session.add(record)
                session.flush()
                created_ids.append(record.id)

            session.commit()

        logger.info(
            "ExplanationService: saved %d explanation(s) for trip=%s itinerary=%s",
            len(created_ids), trip_id, itinerary_id,
        )
        return created_ids

    @staticmethod
    def get_explanations(
        itinerary_id: UUID,
        family_id: Optional[UUID] = None,
    ) -> List[ItineraryExplanation]:
        """
        Retrieve all explanations for a given itinerary version.

        Args:
            itinerary_id: The post-change itinerary UUID
            family_id:    Optional filter by family

        Returns:
            List of ItineraryExplanation records ordered by day → poi_id
        """
        with Session(engine) as session:
            stmt = select(ItineraryExplanation).where(
                ItineraryExplanation.itinerary_id == itinerary_id
            )
            if family_id:
                stmt = stmt.where(ItineraryExplanation.family_id == family_id)
            stmt = stmt.order_by(
                ItineraryExplanation.day_number,
                ItineraryExplanation.poi_id,
            )
            return list(session.exec(stmt).all())

    @staticmethod
    def get_trip_explanations(
        trip_id: str,
        family_id: Optional[UUID] = None,
    ) -> List[ItineraryExplanation]:
        """
        Retrieve all explanations for a trip (across all itinerary versions).

        Args:
            trip_id:   The trip identifier
            family_id: Optional filter by family

        Returns:
            List ordered by created_at desc
        """
        with Session(engine) as session:
            stmt = (
                select(ItineraryExplanation)
                .where(ItineraryExplanation.trip_id == trip_id)
                .order_by(ItineraryExplanation.created_at.desc())
            )
            if family_id:
                stmt = stmt.where(ItineraryExplanation.family_id == family_id)
            return list(session.exec(stmt).all())
