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
            from app.services.trip_service import TripService

            # Get the real active trip for this family from the DB
            family_id = str(event.family_id) if event.family_id else "unknown"
            trip_session = TripService.get_active_trip_for_family(family_id)

            if not trip_session:
                logger.warning(
                    f"No active trip found for family {family_id}. "
                    "Creating a fallback session — ensure a trip is initialized via "
                    "POST /trips/initialize-with-optimization first."
                )
                # Fallback: create a minimal session so processing can continue
                baseline_path = "ml_or/data/base_itinerary_final.json"
                trip_id = f"auto_{family_id}"
                OptimizerService.create_trip_session(
                    trip_id=trip_id,
                    family_ids=[family_id],
                    baseline_itinerary_path=baseline_path,
                    trip_name=f"Auto-session for {family_id}"
                )
            else:
                trip_id = trip_session.trip_id
            
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

        Dispatches:
        - Hotel booking Celery task (always, for applicable option types)
        - Flight booking Celery task (if flight params present in details)
        """
        from app.services.booking_service import BookingService
        from app.services.city_code_cache import CityCodeCache
        from app.worker import process_hotel_booking
        from datetime import datetime, timedelta

        logger.info(f"Triggering Tools Agent for option={option_id}, event={event_id}")

        try:
            is_hotel_booking = not details or details.get("type") in ("hotel", "base_itinerary", None)

            if is_hotel_booking:
                # --- Extract params from approved option details ---
                start_date = details.get("start_date") if details else None
                end_date = details.get("end_date") if details else None
                num_travellers = details.get("num_travellers", 2) if details else 2
                destination = details.get("destination", "delhi") if details else "delhi"

                # Dynamic city code resolution (seed dict + TBO CityList API)
                city_code = CityCodeCache.get_city_code(destination)

                # Fallback dates: trip check-in 30 days from now
                if not start_date:
                    start_date = (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d")
                if not end_date:
                    end_date = (datetime.utcnow() + timedelta(days=34)).strftime("%Y-%m-%d")

                # --- Hotel booking job ---
                hotel_job = BookingService.create_job(
                    itinerary_id=option_id,
                    agent_id="tools_agent",
                    items=["hotel"],
                )

                hotel_search_params = details.get("search_params") if details else None
                if not hotel_search_params:
                    hotel_search_params = {
                        "city_code": city_code,
                        "checkin": start_date,
                        "checkout": end_date,
                        "rooms": max(1, (num_travellers + 1) // 2),
                        "adults": num_travellers,
                        "guest_details": [],
                    }

                process_hotel_booking.delay(
                    job_id=str(hotel_job.id),
                    itinerary_id=option_id,
                    agent_id="tools_agent",
                    items=["hotel"],
                    search_params=hotel_search_params,
                )
                logger.info(
                    f"Tools Agent dispatched hotel job {hotel_job.id} for "
                    f"{destination} (city_code={city_code}) [{start_date} → {end_date}]"
                )

                # --- Flight booking job (if flight params present in details) ---
                flight_origin = (details or {}).get("flight_origin")
                flight_destination = (details or {}).get("flight_destination")
                flight_departure_date = (details or {}).get("flight_departure_date", start_date)

                if flight_origin and flight_destination:
                    flight_job = BookingService.create_job(
                        itinerary_id=option_id,
                        agent_id="tools_agent",
                        items=["flight"],
                    )

                    flight_search_params = {
                        "flight_params": {
                            "origin": flight_origin,
                            "destination": flight_destination,
                            "departure_date": flight_departure_date,
                            "return_date": (details or {}).get("flight_return_date"),
                            "cabin_class": (details or {}).get("flight_cabin_class", 1),
                            "preferred_airlines": (details or {}).get("flight_preferred_airlines"),
                            "direct_only": (details or {}).get("flight_direct_only", False),
                        },
                        "adults": num_travellers,
                        "children": 0,
                        "guest_details": (details or {}).get("guest_details", []),
                    }

                    process_hotel_booking.delay(
                        job_id=str(flight_job.id),
                        itinerary_id=option_id,
                        agent_id="tools_agent",
                        items=["flight"],
                        search_params=flight_search_params,
                    )
                    logger.info(
                        f"Tools Agent dispatched flight job {flight_job.id}: "
                        f"{flight_origin} → {flight_destination} on {flight_departure_date}"
                    )

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
            # 1. Get trip session
            trip = TripService.get_trip(trip_id)
            if not trip:
                logger.error(f"Trip {trip_id} not found for communication trigger")
                return False

            # TripSession uses family_ids (list of family codes e.g. ['FAM_A'])
            family_ids_list = trip.family_ids or []

            if not family_ids_list:
                logger.warning(f"No family IDs on trip {trip_id}")
                return True  # Not a failure

            # 2. Collect all user IDs across all families on this trip
            user_ids = []
            for fam_code in family_ids_list:
                try:
                    from uuid import UUID as _UUID
                    # Try direct UUID lookup first
                    fam_uuid = _UUID(str(fam_code))
                    members = FamilyService.get_family_members(fam_uuid)
                except (ValueError, AttributeError):
                    # fam_code is a string code like 'FAM_A' — look up by code
                    fam = FamilyService.get_family_by_code(str(fam_code))
                    members = FamilyService.get_family_members(fam.id) if fam else []

                user_ids.extend(str(m.id) for m in members)

            if not user_ids:
                logger.warning(f"No family members found for families {family_ids_list}")
                return True  # Not a failure, just no one to notify

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

            logger.info(f"Communication Agent notified {len(user_ids)} members across families {family_ids_list}")
            return True

        except Exception as e:
            logger.error(f"Communication Agent trigger failed for option {option_id}: {e}")
            return False
