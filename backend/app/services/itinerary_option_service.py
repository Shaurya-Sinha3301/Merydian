"""
Itinerary Option Service

Handles all database operations for itinerary options.
Follows the same static-method pattern as EventService.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from sqlmodel import Session, select
from app.core.db import engine
from app.models.itinerary_option import ItineraryOptionDB, OptionStatus


class ItineraryOptionService:
    """Service for managing itinerary options in the database."""

    @staticmethod
    def get_options_for_event(
        event_id: str,
        agent_id: Optional[UUID] = None,
        status: Optional[OptionStatus] = None
    ) -> List[ItineraryOptionDB]:
        """
        Get itinerary options for a specific event.

        Args:
            event_id: Event identifier
            agent_id: Optional — filter to options assigned to this agent
            status: Optional — filter by status (defaults to all)

        Returns:
            List of ItineraryOptionDB records
        """
        with Session(engine) as session:
            stmt = select(ItineraryOptionDB).where(
                ItineraryOptionDB.event_id == event_id
            )
            if agent_id is not None:
                stmt = stmt.where(ItineraryOptionDB.agent_id == agent_id)
            if status is not None:
                stmt = stmt.where(ItineraryOptionDB.status == status)

            stmt = stmt.order_by(ItineraryOptionDB.satisfaction.desc())
            results = session.exec(stmt)
            return list(results.all())

    @staticmethod
    def get_option_by_id(option_id: UUID) -> Optional[ItineraryOptionDB]:
        """Get a single option by its primary key."""
        with Session(engine) as session:
            return session.get(ItineraryOptionDB, option_id)

    @staticmethod
    def approve_option(option_id: UUID, agent_id: UUID) -> ItineraryOptionDB:
        """
        Approve an itinerary option and reject all sibling options for the same event.

        Args:
            option_id: Option to approve
            agent_id: Agent performing the approval

        Returns:
            The approved ItineraryOptionDB record

        Raises:
            ValueError: If option not found or not in PENDING status
        """
        with Session(engine) as session:
            option = session.get(ItineraryOptionDB, option_id)
            if not option:
                raise ValueError(f"Itinerary option '{option_id}' not found")
            if option.status != OptionStatus.PENDING:
                raise ValueError(
                    f"Option '{option_id}' is already {option.status.value} and cannot be approved"
                )

            # Approve this option
            option.status = OptionStatus.APPROVED
            option.approved_by = agent_id
            option.approved_at = datetime.utcnow()
            session.add(option)

            # Reject all sibling options for the same event
            siblings = session.exec(
                select(ItineraryOptionDB).where(
                    ItineraryOptionDB.event_id == option.event_id,
                    ItineraryOptionDB.id != option_id,
                    ItineraryOptionDB.status == OptionStatus.PENDING,
                )
            ).all()

            for sibling in siblings:
                sibling.status = OptionStatus.REJECTED
                session.add(sibling)

            session.commit()
            session.refresh(option)
            return option

    @staticmethod
    def create_option(
        event_id: str,
        trip_id: str,
        summary: str,
        cost: float,
        satisfaction: float,
        details: Optional[dict] = None,
        agent_id: Optional[UUID] = None,
    ) -> ItineraryOptionDB:
        """
        Create a new itinerary option (called by optimizer pipeline).

        Args:
            event_id: Triggering event ID
            trip_id: Related trip session ID
            summary: Human-readable description
            cost: Estimated cost
            satisfaction: Predicted satisfaction score (0-1)
            details: Full itinerary diff / POI list
            agent_id: Assigned travel agent

        Returns:
            Created ItineraryOptionDB record
        """
        with Session(engine) as session:
            option = ItineraryOptionDB(
                event_id=event_id,
                trip_id=trip_id,
                summary=summary,
                cost=cost,
                satisfaction=satisfaction,
                details=details or {},
                agent_id=agent_id,
            )
            session.add(option)
            session.commit()
            session.refresh(option)
            return option
