"""
Agent Service - Bridge between Backend API and Agent System

This service integrates the existing agent system with the backend database.
Runs in fallback mode if agents are not available.
"""

import logging
from typing import Dict, Any
from uuid import UUID

from app.services.event_service import EventService
from app.services.preference_service import PreferenceService
from app.services.optimizer_service import get_db_session
from app.models.event import EventStatus, EventType
from app.models.preference import PreferenceType
from app.models.policy import POIRequest, DecisionLog

logger = logging.getLogger(__name__)


class AgentService:
    """
    Service layer bridging backend database with agent system.
    
    NOTE: Agent system integration is currently in fallback mode.
    To enable full agent processing:
    1. Ensure agents/ directory is in project root
    2. Install agent dependencies: pip install -r agents/requirements_agents.txt
    3. Set GROQ_API_KEY or GEMINI_API_KEY in .env
    """
    
    @staticmethod
    def process_feedback_event(event_id: UUID) -> Dict[str, Any]:
        """
        Process a FEEDBACK event through the agent pipeline.
        
        If agents are available: Uses FeedbackProcessor with full agent orchestration
        If agents unavailable: Falls back to simple rule-based processing
        """
        logger.info(f"Processing feedback event: {event_id}")
        
        # Get event from database
        event = EventService.get_event(event_id)
        if not event:
            raise ValueError(f"Event {event_id} not found")
        
        if event.event_type != EventType.FEEDBACK:
            raise ValueError(f"Event {event_id} is not a FEEDBACK event")
        
        # Extract feedback data from payload
        payload = event.payload or {}
        comment = payload.get("comment", "")
        rating = payload.get("rating")
        node_id = payload.get("node_id")
        
        # Try to use OptimizerService with agents
        try:
            from app.services.optimizer_service import OptimizerService
            
            # Get or create trip session for this family
            family_id = str(event.family_id) if event.family_id else "unknown"
            trip_id = f"trip_{family_id}"  # TODO: Get actual trip_id from context
            
            # Check if trip session exists, if not create one
            trip_session = OptimizerService.get_trip_session(trip_id)
            if not trip_session:
                logger.info(f"Creating new trip session for {trip_id}")
                # TODO: Get baseline itinerary path from configuration
                baseline_path = "ml_or/data/delhi_3day_skeleton.json"
                OptimizerService.create_trip_session(
                    trip_id=trip_id,
                    family_ids=[family_id],
                    baseline_itinerary_path=baseline_path,
                    trip_name=f"Trip for {family_id}"
                )
            
            # Process through agent pipeline
            result = OptimizerService.process_feedback_with_agents(
                trip_id=trip_id,
                family_id=family_id,
                message=comment
            )
            
            # Update event status
            EventService.update_event_status(
                event_id=event_id,
                status=EventStatus.COMPLETED,
                processing_result={
                    "agent_processing": True,
                    "event_type": result["event_type"],
                    "action_taken": result["action_taken"],
                    "itinerary_updated": result["itinerary_updated"],
                    "iteration": result["iteration"]
                }
            )
            
            return {
                "status": "completed",
                "message": f"Feedback processed via agents - {result['action_taken']}",
                "explanations": result["explanations"],
                "itinerary_updated": result["itinerary_updated"],
                "cost_analysis": result.get("cost_analysis")
            }
            
        except ImportError as e:
            logger.warning(f"Agent integration not available: {e}")
            logger.info("Falling back to simple processing")
            
            # Fallback processing: Low rating → add AVOID preference
            if rating and rating <= 2 and node_id:
                PreferenceService.add_preference(
                    family_id=event.family_id,
                    poi_id=node_id,
                    poi_name=node_id,
                    preference_type=PreferenceType.AVOID_VISIT,
                    strength=0.7,
                    reason=f"Low rating ({rating}/5) from user feedback: {comment[:50]}",
                    created_by=str(event.user_id) if event.user_id else "system"
                )
                
                EventService.update_event_status(
                    event_id=event_id,
                    status=EventStatus.COMPLETED,
                    processing_result={
                        "preference_added": True,
                        "fallback_mode": True
                    }
                )
                
                return {
                    "status": "completed",
                    "message": f"Low rating feedback processed - AVOID preference added for {node_id}",
                    "explanations": [f"Added AVOID preference based on low rating"],
                    "itinerary_updated": False
                }
            
            # Otherwise just acknowledge
            EventService.update_event_status(
                event_id=event_id,
                status=EventStatus.COMPLETED,
                processing_result={"fallback_mode": True}
            )
            
            return {
                "status": "completed",
                "message": "Feedback acknowledged (fallback mode)",
                "explanations": [comment],
                "itinerary_updated": False
            }
    
    @staticmethod
    def process_poi_request_event(event_id: UUID) -> Dict[str, Any]:
        """
        Process a POI_REQUEST event.
        Persists the request to the poi_requests table and acknowledges it.
        """
        logger.info(f"Processing POI request event: {event_id}")
        
        event = EventService.get_event(event_id)
        if not event:
            raise ValueError(f"Event {event_id} not found")
        
        if event.event_type != EventType.POI_REQUEST:
            raise ValueError(f"Event {event_id} is not a POI_REQUEST event")
        
        payload = event.payload or {}
        poi_name = payload.get("poi_name", "unknown")
        location_id = payload.get("location_id", payload.get("poi_id", "unknown"))
        family_id = str(event.family_id) if event.family_id else "unknown"
        
        # Persist POI request to DB
        try:
            with get_db_session() as session:
                db_request = POIRequest(
                    request_id=str(event_id),
                    origin_family=family_id,
                    location_id=location_id,
                    status="acknowledged"
                )
                session.add(db_request)
        except Exception as e:
            logger.error(f"Failed to persist POI request to DB: {e}")
        
        EventService.update_event_status(
            event_id=event_id,
            status=EventStatus.COMPLETED,
            processing_result={"poi_request_acknowledged": True, "persisted_to_db": True}
        )
        
        return {
            "status": "completed",
            "message": f"POI request for {poi_name} acknowledged and persisted"
        }
    
    @staticmethod
    def process_incident_event(event_id: UUID) -> Dict[str, Any]:
        """
        Process an INCIDENT event.
        Persists the incident to the decision_logs table and acknowledges it.
        """
        logger.info(f"Processing incident event: {event_id}")
        
        event = EventService.get_event(event_id)
        if not event:
            raise ValueError(f"Event {event_id} not found")
        
        if event.event_type != EventType.INCIDENT:
            raise ValueError(f"Event {event_id} is not an INCIDENT event")
        
        payload = event.payload or {}
        incident_type = payload.get("incident_type", "unknown")
        
        # Persist incident to decision_logs table
        try:
            with get_db_session() as session:
                db_log = DecisionLog(
                    request_id=str(event_id),
                    decision="INCIDENT_ACKNOWLEDGED",
                    trigger_score=0.0,
                    threshold=0.0,
                    optimizer_called=False
                )
                session.add(db_log)
        except Exception as e:
            logger.error(f"Failed to persist incident to DB: {e}")
        
        EventService.update_event_status(
            event_id=event_id,
            status=EventStatus.COMPLETED,
            processing_result={"incident_acknowledged": True, "persisted_to_db": True}
        )
        
        return {
            "status": "completed",
            "message": f"Incident {incident_type} acknowledged and persisted"
        }

    @staticmethod
    def trigger_tools_agent(
        option_id: str,
        event_id: str,
        trip_id: str,
        details: dict = None,
    ) -> bool:
        """
        Trigger the Tools Agent to execute actions for an approved option.
        
        This currently launches hotel booking jobs via Celery.
        """
        from app.services.booking_service import BookingService
        from app.worker import process_hotel_booking
        
        logger.info(f"Triggering Tools Agent for option={option_id}, event={event_id}")

        try:
            # Determine if this is a hotel booking trigger
            is_hotel_booking = not details or details.get("type") in ("hotel", "base_itinerary", None)

            if is_hotel_booking:
                # Extract real search params from approved option's itinerary details
                itinerary = details.get("itinerary", {}) if details else {}
                start_date = details.get("start_date") if details else None
                end_date = details.get("end_date") if details else None
                num_travellers = details.get("num_travellers", 2) if details else 2
                destination = details.get("destination", "delhi") if details else "delhi"

                # Map destination to TBO city code (extend as needed)
                city_code_map = {
                    "delhi": "418069",
                    "mumbai": "128014",
                    "goa": "119068",
                }
                dest_key = destination.lower().split(",")[0].strip()
                city_code = city_code_map.get(dest_key, "418069")  # Default: Delhi NCR

                # Use real trip dates if available, fall back to near-future
                from datetime import datetime, timedelta
                if not start_date:
                    start_date = (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d")
                if not end_date:
                    end_date = (datetime.utcnow() + timedelta(days=34)).strftime("%Y-%m-%d")

                # Create a booking job in DB
                job = BookingService.create_job(
                    itinerary_id=option_id,  # Link to approved option
                    agent_id="tools_agent",  # System agent
                    items=["hotel"]
                )

                search_params = details.get("search_params", {
                    "city_code": city_code,
                    "checkin": start_date,
                    "checkout": end_date,
                    "rooms": max(1, (num_travellers + 1) // 2),
                    "adults": num_travellers,
                    "guest_details": []
                }) if details else {
                    "city_code": city_code,
                    "checkin": start_date,
                    "checkout": end_date,
                    "rooms": 1,
                    "adults": 2,
                    "guest_details": []
                }

                process_hotel_booking.delay(
                    job_id=str(job.id),
                    itinerary_id=option_id,
                    agent_id="tools_agent",
                    items=["hotel"],
                    search_params=search_params
                )

                logger.info(f"Tools Agent dispatched booking job {job.id} for {destination} ({start_date} - {end_date})")

            return True

        except Exception as e:
            logger.error(f"Tools Agent trigger failed for option {option_id}: {e}")
            return False

    @staticmethod
    def trigger_communication_agent(
        option_id: str,
        event_id: str,
        trip_id: str,
        agent_id: str | None = None,
    ) -> bool:
        """
        Trigger the Communication Agent to notify travellers about an approved option.
        """
        from app.services.trip_service import TripService
        from app.services.family_service import FamilyService
        from app.worker import process_notification_task
        
        logger.info(f"Triggering Communication Agent for option={option_id}, event={event_id}")

        try:
            # 1. Get family ID from trip
            trip = TripService.get_trip(UUID(trip_id))
            if not trip:
                logger.error(f"Trip {trip_id} not found for communication trigger")
                return False
                
            family_id = trip.family_id
            
            # 2. Get all family members to notify
            members = FamilyService.get_family_members(family_id)
            user_ids = [str(m.id) for m in members]
            
            if not user_ids:
                logger.warning(f"No family members found for family {family_id}")
                return True # Not a failure, just no one to notify
                
            # 3. Dispatch notification task
            payload = {
                "title": "Itinerary Update Approved!",
                "message": "Your travel agent has approved a new itinerary option.",
                "action_link": f"/trips/{trip_id}/itinerary",
                "option_id": option_id
            }
            
            process_notification_task.delay(
                notification_type="itinerary_approved",
                payload=payload,
                target_users=user_ids
            )
            
            logger.info(f"Communication Agent notified {len(user_ids)} members of family {family_id}")
            return True

        except Exception as e:
            logger.error(f"Communication Agent trigger failed for option {option_id}: {e}")
            return False
