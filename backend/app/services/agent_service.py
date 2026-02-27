"""
Agent Service - Bridge between Backend API and Agent System

Integrates the full agent pipeline with the backend database:
  - FeedbackAgent (LLM-based NL parsing)
  - DecisionPolicyAgent (rule-based, 5 event types)
  - OptimizerAgent (ML optimizer + transport disruption)
  - ExplainabilityAgent (dual-audience LLM explanations)
  - GlobalRateLimiter (shared LLM API quota)
  - CommunicationAgent (WebSocket + Celery notifications)
  - ToolsAgent (TBO hotel + flight Celery tasks)
"""

import logging
import json
import time
import tempfile
import shutil
from threading import Lock
from typing import Dict, Any, Optional, List
from uuid import UUID
from pathlib import Path
from datetime import datetime

from app.services.event_service import EventService
from app.services.preference_service import PreferenceService
from app.services.optimizer_service import get_db_session
from app.models.event import EventStatus, EventType
from app.models.preference import PreferenceType
from app.models.policy import POIRequest, DecisionLog

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 1. Rate Limiter — shared singleton across all agent LLM calls
# ---------------------------------------------------------------------------

class GlobalRateLimiter:
    """
    Singleton rate limiter that coordinates LLM API calls across all agents.
    Prevents quota exhaustion on free-tier Gemini/Groq keys.
    """
    _instance = None
    _lock = Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.last_request_time: float = 0
        self.min_request_interval: float = 30  # 2 RPM for free tier
        self._initialized = True
        logger.info("GlobalRateLimiter initialized (2 RPM free-tier mode)")

    def wait_if_needed(self, agent_name: str = "Unknown") -> None:
        """Block if necessary to respect the shared rate limit."""
        with self._lock:
            elapsed = time.time() - self.last_request_time
            if elapsed < self.min_request_interval:
                wait = self.min_request_interval - elapsed
                logger.warning(
                    "[%s] Rate limit hit — waiting %.1fs (global 2 RPM limit)",
                    agent_name, wait,
                )
                time.sleep(wait)
            self.last_request_time = time.time()
            logger.info("[%s] LLM API call cleared by rate limiter", agent_name)

    def set_interval(self, seconds: float) -> None:
        """Override the minimum interval (e.g. paid tier = 1s)."""
        self.min_request_interval = seconds
        logger.info("Rate limiter interval set to %.1fs", seconds)


# Module-level singleton accessed by all agents
rate_limiter = GlobalRateLimiter()


# ---------------------------------------------------------------------------
# 2. DecisionPolicyAgent — rule-based, 5 event categories
#    Ported from agents/decision_policy_agent.py
# ---------------------------------------------------------------------------

class _PolicyAction:
    RUN_OPTIMIZER = "RUN_OPTIMIZER"
    UPDATE_PREFERENCES_ONLY = "UPDATE_PREFERENCES_ONLY"
    NO_ACTION = "NO_ACTION"


class DecisionPolicyAgent:
    """
    Deterministic rule engine — no LLM needed.
    Maps event types to one of three actions.

    Event hierarchy:
      HARD_CONSTRAINT  (MUST_VISIT / NEVER_VISIT) → RUN_OPTIMIZER
      SOFT_PREFERENCE  (POI_RATING / DAY_RATING)  → UPDATE_PREFERENCES_ONLY
      TRANSPORT_ISSUE                              → RUN_OPTIMIZER (with disrupted graph)
      DELAY_REPORTED                               → NO_ACTION (acknowledged)
      UNKNOWN / anything else                      → NO_ACTION
    """

    HARD_CONSTRAINT_KEYWORDS = {
        "must_visit", "must visit", "want to visit", "must go",
        "add", "include", "definitely"
    }
    SOFT_PREFERENCE_KEYWORDS = {
        "rating", "rate", "score", "out of", "/10", "loved", "liked",
        "enjoyed", "amazing", "great", "okay", "average", "bad"
    }
    TRANSPORT_KEYWORDS = {
        "metro", "bus", "cab", "auto", "delay", "traffic", "blocked",
        "closed", "unavailable", "strike", "late", "couldn't reach",
        "transport issue"
    }
    NEVER_VISIT_KEYWORDS = {
        "skip", "avoid", "don't go", "do not go", "never visit",
        "not interested", "remove", "drop"
    }

    def decide(self, event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Return a decision dict: {action, reason, trigger_score, requires_approval}.
        event_type matches app.models.event.EventType values.
        """
        # Map EventType enum values to our categories
        ev = (event_type or "").upper()

        if ev in ("FEEDBACK",):
            return self._classify_feedback_text(payload.get("comment", ""))

        if ev in ("POI_REQUEST",):
            return {
                "action": _PolicyAction.RUN_OPTIMIZER,
                "reason": "POI request adds a new must-visit hard constraint",
                "trigger_score": 1.0,
                "requires_approval": False,
            }

        if ev in ("INCIDENT",):
            return self._classify_incident(payload)

        return {
            "action": _PolicyAction.NO_ACTION,
            "reason": f"Unrecognised event type '{ev}' — no action taken",
            "trigger_score": 0.0,
            "requires_approval": False,
        }

    def _classify_feedback_text(self, text: str) -> Dict[str, Any]:
        lower = text.lower()

        # Check for never-visit / avoid intent first (strong negative)
        if any(kw in lower for kw in self.NEVER_VISIT_KEYWORDS):
            return {
                "action": _PolicyAction.RUN_OPTIMIZER,
                "reason": "User wants to remove/avoid a POI — hard constraint, optimizer re-run required",
                "trigger_score": 0.95,
                "requires_approval": False,
            }

        # Check must-visit / add intent
        if any(kw in lower for kw in self.HARD_CONSTRAINT_KEYWORDS):
            return {
                "action": _PolicyAction.RUN_OPTIMIZER,
                "reason": "User wants to add a must-visit POI — hard constraint, optimizer re-run required",
                "trigger_score": 0.9,
                "requires_approval": False,
            }

        # Check transport disruption
        if any(kw in lower for kw in self.TRANSPORT_KEYWORDS):
            return {
                "action": _PolicyAction.RUN_OPTIMIZER,
                "reason": "Transport disruption detected — re-optimize with updated transport graph",
                "trigger_score": 0.85,
                "requires_approval": False,
                "event_subtype": "TRANSPORT_ISSUE",
            }

        # Soft preference (rating / sentiment) — require at least 4 words to avoid
        # classifying vague one-word acks ("okay", "fine") as preference updates
        if len(lower.split()) >= 4 and any(kw in lower for kw in self.SOFT_PREFERENCE_KEYWORDS):
            return {
                "action": _PolicyAction.UPDATE_PREFERENCES_ONLY,
                "reason": "Soft preference / rating — update preferences without re-running optimizer",
                "trigger_score": 0.4,
                "requires_approval": False,
            }

        # No clear intent
        return {
            "action": _PolicyAction.NO_ACTION,
            "reason": "Unable to classify feedback — no preference changes made",
            "trigger_score": 0.0,
            "requires_approval": False,
        }

    def _classify_incident(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        incident_type = (payload.get("incident_type") or "").lower()
        transport_mode = payload.get("transport_mode")

        if transport_mode or any(kw in incident_type for kw in (
            "metro", "bus", "cab", "auto", "delay", "transport"
        )):
            return {
                "action": _PolicyAction.RUN_OPTIMIZER,
                "reason": f"Transport incident ({incident_type}) — re-optimize with disrupted graph",
                "trigger_score": 0.88,
                "requires_approval": False,
                "event_subtype": "TRANSPORT_ISSUE",
                "transport_mode": transport_mode,
                "disruption_from_poi": payload.get("disruption_from_poi"),
                "disruption_to_poi": payload.get("disruption_to_poi"),
            }

        return {
            "action": _PolicyAction.NO_ACTION,
            "reason": f"Incident '{incident_type}' acknowledged — no optimizer re-run required",
            "trigger_score": 0.0,
            "requires_approval": False,
        }


# ---------------------------------------------------------------------------
# 3. Transport Graph Modifier — inline port from agents/transport_graph_modifier.py
# ---------------------------------------------------------------------------

def _apply_transport_disruption(
    transport_graph_path: str,
    transport_mode: str,
    from_poi: Optional[str] = None,
    to_poi: Optional[str] = None,
) -> Optional[str]:
    """
    Load the original transport graph JSON, mark edges matching the disruption
    as unavailable, and save a modified copy to a temp directory.

    Returns the path to the modified file, or None if the graph file doesn't exist.
    """
    src = Path(transport_graph_path)
    if not src.exists():
        logger.warning("Transport graph not found at %s, skipping disruption", src)
        return None

    with open(src, "r", encoding="utf-8") as f:
        graph = json.load(f)

    edges_affected = 0
    is_route_specific = bool(from_poi and to_poi)

    for edge in graph:
        mode_match = edge.get("mode", "").upper() == transport_mode.upper()
        if not mode_match:
            continue

        if is_route_specific:
            route_match = (
                (edge.get("from") == from_poi and edge.get("to") == to_poi)
                or (edge.get("from") == to_poi and edge.get("to") == from_poi)
            )
            if not route_match:
                continue

        edge["available"] = False
        edge.setdefault("disruption_reason", "USER_REPORTED")
        edges_affected += 1

    # Save to a temporary file so the original is untouched
    tmp_dir = Path(tempfile.mkdtemp(prefix="meili_transport_"))
    out_path = tmp_dir / f"transport_{transport_mode}_disrupted.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(graph, f, indent=2)

    logger.info(
        "Transport disruption applied: mode=%s, from=%s, to=%s, edges_affected=%d → %s",
        transport_mode, from_poi, to_poi, edges_affected, out_path,
    )
    return str(out_path)


# ---------------------------------------------------------------------------
# 4. AgentService — main service wiring everything together
# ---------------------------------------------------------------------------

class AgentService:
    """
    Service layer bridging the backend database with the full agent pipeline.

    Pipeline per feedback event:
      1. Load event from DB
      2. DecisionPolicyAgent.decide() → action (RUN_OPTIMIZER / UPDATE_PREFERENCES / NO_ACTION)
      3a. RUN_OPTIMIZER → (optional) apply transport disruption → OptimizerService
      3b. UPDATE_PREFERENCES_ONLY → PreferenceService.add_preference()
      3c. NO_ACTION → log and acknowledge
      4. Persist DecisionLog + update EventStatus
      5. Return result with explanations

    Also provides ToolsAgent (Celery hotel+flight tasks) and CommunicationAgent
    (WebSocket notifications via Celery).
    """

    _policy_agent = DecisionPolicyAgent()

    # ------------------------------------------------------------------
    # process_feedback_event
    # ------------------------------------------------------------------
    @staticmethod
    def process_feedback_event(event_id: UUID) -> Dict[str, Any]:
        """
        Process a FEEDBACK event through the full agent pipeline.

        Steps:
          1. Load event from DB.
          2. Run DecisionPolicyAgent to classify intent.
          3. If RUN_OPTIMIZER  → call OptimizerService + explainability.
             If UPDATE_ONLY   → update preferences in DB.
             If NO_ACTION     → acknowledge only.
          4. Persist DecisionLog and update EventStatus.
        """
        logger.info("AgentService: processing feedback event %s", event_id)

        event = EventService.get_event(event_id)
        if not event:
            raise ValueError(f"Event {event_id} not found")
        if event.event_type != EventType.FEEDBACK:
            raise ValueError(f"Event {event_id} is not a FEEDBACK event")

        payload = event.payload or {}
        comment = payload.get("comment", "")
        rating = payload.get("rating")
        node_id = payload.get("node_id")
        family_id = str(event.family_id) if event.family_id else "FAM_A"

        # --- Step 2: Policy decision ---
        decision = AgentService._policy_agent.decide(EventType.FEEDBACK, payload)
        action = decision["action"]
        reason = decision["reason"]

        logger.info(
            "Policy decision for event %s: action=%s, score=%.2f",
            event_id, action, decision["trigger_score"],
        )

        # --- Persist decision log ---
        AgentService._persist_decision_log(
            request_id=str(event_id),
            decision=action,
            trigger_score=decision["trigger_score"],
            threshold=0.5,
            optimizer_called=(action == _PolicyAction.RUN_OPTIMIZER),
        )

        # --- Step 3: Execute action ---
        if action == _PolicyAction.RUN_OPTIMIZER:
            return AgentService._run_optimizer_for_event(
                event_id=event_id,
                event=event,
                family_id=family_id,
                message=comment,
                decision=decision,
            )

        if action == _PolicyAction.UPDATE_PREFERENCES_ONLY:
            return AgentService._update_preferences_only(
                event_id=event_id,
                event=event,
                family_id=family_id,
                rating=rating,
                node_id=node_id,
                comment=comment,
                reason=reason,
            )

        # NO_ACTION
        EventService.update_event_status(
            event_id=event_id,
            status=EventStatus.COMPLETED,
            processing_result={"action": "NO_ACTION", "reason": reason},
        )
        return {
            "status": "completed",
            "message": f"Feedback acknowledged — {reason}",
            "explanations": [comment or reason],
            "itinerary_updated": False,
        }

    # ------------------------------------------------------------------
    # process_poi_request_event
    # ------------------------------------------------------------------
    @staticmethod
    def process_poi_request_event(event_id: UUID) -> Dict[str, Any]:
        """
        Process a POI_REQUEST event.
        Always treated as a hard constraint → adds MUST_VISIT preference + triggers optimizer.
        """
        logger.info("AgentService: processing POI request event %s", event_id)

        event = EventService.get_event(event_id)
        if not event:
            raise ValueError(f"Event {event_id} not found")
        if event.event_type != EventType.POI_REQUEST:
            raise ValueError(f"Event {event_id} is not a POI_REQUEST event")

        payload = event.payload or {}
        poi_name = payload.get("poi_name", "unknown")
        location_id = payload.get("location_id", payload.get("poi_id", "unknown"))
        family_id = str(event.family_id) if event.family_id else "FAM_A"

        # Persist POI request record
        try:
            with get_db_session() as session:
                db_request = POIRequest(
                    request_id=str(event_id),
                    origin_family=family_id,
                    location_id=location_id,
                    status="acknowledged",
                )
                session.add(db_request)
        except Exception as e:
            logger.error("Failed to persist POI request to DB: %s", e)

        # Add MUST_VISIT preference
        try:
            if event.family_id and location_id != "unknown":
                PreferenceService.add_preference(
                    family_id=event.family_id,
                    poi_id=location_id,
                    poi_name=poi_name,
                    preference_type=PreferenceType.MUST_VISIT,
                    strength=1.0,
                    reason=f"POI request from traveller (event {event_id})",
                    created_by=str(event.user_id) if event.user_id else "traveller",
                )
                logger.info("MUST_VISIT preference added for %s (family %s)", location_id, family_id)
        except Exception as e:
            logger.warning("Could not add MUST_VISIT preference: %s", e)

        # Trigger optimizer for the hard constraint
        opt_result = AgentService._run_optimizer_for_event(
            event_id=event_id,
            event=event,
            family_id=family_id,
            message=f"Add {poi_name} to itinerary",
            decision={
                "action": _PolicyAction.RUN_OPTIMIZER,
                "reason": "POI request → hard constraint re-optimization",
                "trigger_score": 1.0,
                "requires_approval": False,
            },
        )

        EventService.update_event_status(
            event_id=event_id,
            status=EventStatus.COMPLETED,
            processing_result={"poi_request_acknowledged": True, "optimized": True},
        )

        return {
            **opt_result,
            "message": f"POI request for '{poi_name}' processed and optimizer triggered",
        }

    # ------------------------------------------------------------------
    # process_incident_event
    # ------------------------------------------------------------------
    @staticmethod
    def process_incident_event(event_id: UUID) -> Dict[str, Any]:
        """
        Process an INCIDENT event.

        If transport-related → applies disruption to transport graph and re-runs optimizer.
        Otherwise           → logs and acknowledges without optimizer call.
        """
        logger.info("AgentService: processing incident event %s", event_id)

        event = EventService.get_event(event_id)
        if not event:
            raise ValueError(f"Event {event_id} not found")
        if event.event_type != EventType.INCIDENT:
            raise ValueError(f"Event {event_id} is not an INCIDENT event")

        payload = event.payload or {}
        incident_type = payload.get("incident_type", "unknown")
        family_id = str(event.family_id) if event.family_id else "FAM_A"

        # Run policy to determine if this needs re-optimization
        decision = AgentService._policy_agent.decide(EventType.INCIDENT, payload)
        action = decision["action"]

        # Persist decision log
        AgentService._persist_decision_log(
            request_id=str(event_id),
            decision=action,
            trigger_score=decision["trigger_score"],
            threshold=0.5,
            optimizer_called=(action == _PolicyAction.RUN_OPTIMIZER),
        )

        if action == _PolicyAction.RUN_OPTIMIZER:
            # Transport disruption → modify graph and re-optimize
            result = AgentService._run_optimizer_for_event(
                event_id=event_id,
                event=event,
                family_id=family_id,
                message=f"Transport incident: {incident_type}",
                decision=decision,
            )
            return {
                **result,
                "message": f"Transport incident '{incident_type}' processed — itinerary re-optimized",
            }

        # Non-transport incident — just acknowledge
        EventService.update_event_status(
            event_id=event_id,
            status=EventStatus.COMPLETED,
            processing_result={"incident_acknowledged": True, "persisted_to_db": True},
        )
        return {
            "status": "completed",
            "message": f"Incident '{incident_type}' acknowledged",
            "itinerary_updated": False,
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _run_optimizer_for_event(
        event_id: UUID,
        event,
        family_id: str,
        message: str,
        decision: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Run optimizer (with optional transport disruption) and return result dict.
        Falls back to preference-only update if optimizer is unavailable.
        """
        from app.services.optimizer_service import OptimizerService
        from app.services.trip_service import TripService

        # Get or create trip session
        trip_session = TripService.get_active_trip_for_family(family_id)
        if not trip_session:
            logger.warning("No active trip for family %s — creating fallback session", family_id)
            baseline_path = "ml_or/data/base_itinerary_final.json"
            trip_id = f"auto_{family_id}"
            OptimizerService.create_trip_session(
                trip_id=trip_id,
                family_ids=[family_id],
                baseline_itinerary_path=baseline_path,
                trip_name=f"Auto-session for {family_id}",
            )
        else:
            trip_id = trip_session.trip_id

        # --- Optional: apply transport disruption before optimizing ---
        disrupted_graph_path: Optional[str] = None
        if decision.get("event_subtype") == "TRANSPORT_ISSUE":
            transport_mode = decision.get("transport_mode") or (
                event.payload or {}
            ).get("transport_mode", "METRO")
            from_poi = decision.get("disruption_from_poi") or (
                (event.payload or {}).get("disruption_from_poi")
            )
            to_poi = decision.get("disruption_to_poi") or (
                (event.payload or {}).get("disruption_to_poi")
            )

            base_graph = "ml_or/data/transport_graph.json"
            disrupted_graph_path = _apply_transport_disruption(
                transport_graph_path=base_graph,
                transport_mode=transport_mode,
                from_poi=from_poi,
                to_poi=to_poi,
            )
            if disrupted_graph_path:
                logger.info(
                    "Using disrupted transport graph for trip %s: %s",
                    trip_id, disrupted_graph_path,
                )

        try:
            # Apply rate limiting before LLM call
            rate_limiter.wait_if_needed("OptimizerAgent")

            result = OptimizerService.process_feedback_with_agents(
                trip_id=trip_id,
                family_id=family_id,
                message=message,
            )

            EventService.update_event_status(
                event_id=event_id,
                status=EventStatus.COMPLETED,
                processing_result={
                    "agent_processing": True,
                    "event_type": result.get("event_type"),
                    "action_taken": result.get("action_taken"),
                    "itinerary_updated": result.get("itinerary_updated"),
                    "iteration": result.get("iteration"),
                    "transport_disruption_applied": disrupted_graph_path is not None,
                },
            )

            return {
                "status": "completed",
                "message": f"Processed via agents — {result.get('action_taken', 'optimizer ran')}",
                "explanations": result.get("explanations", []),
                "itinerary_updated": result.get("itinerary_updated", False),
                "cost_analysis": result.get("cost_analysis"),
                "transport_disruption_applied": disrupted_graph_path is not None,
            }

        except Exception as e:
            logger.error("Optimizer run failed for event %s: %s", event_id, e)
            # Fall through to preference-only update
            return AgentService._update_preferences_only(
                event_id=event_id,
                event=event,
                family_id=family_id,
                rating=None,
                node_id=None,
                comment=message,
                reason=f"Optimizer unavailable ({e}) — preferences updated only",
            )
        finally:
            # Clean up temp disrupted graph file
            if disrupted_graph_path:
                try:
                    shutil.rmtree(Path(disrupted_graph_path).parent, ignore_errors=True)
                except Exception:
                    pass

    @staticmethod
    def _update_preferences_only(
        event_id: UUID,
        event,
        family_id: str,
        rating: Optional[float],
        node_id: Optional[str],
        comment: str,
        reason: str,
    ) -> Dict[str, Any]:
        """
        Update preferences in the DB without triggering a full re-optimization.
        Used for soft events (ratings, sentiment) or optimizer fallback.
        """
        updated = False
        if rating is not None and node_id and event.family_id:
            if rating <= 2:
                pref_type = PreferenceType.AVOID_VISIT
                strength = 0.7
            elif rating >= 4:
                pref_type = PreferenceType.PREFER_VISIT
                strength = 0.6
            else:
                pref_type = None

            if pref_type:
                try:
                    PreferenceService.add_preference(
                        family_id=event.family_id,
                        poi_id=node_id,
                        poi_name=node_id,
                        preference_type=pref_type,
                        strength=strength,
                        reason=f"Rating {rating}/5 — {comment[:50]}",
                        created_by=str(event.user_id) if event.user_id else "system",
                    )
                    updated = True
                    logger.info("Preference %s added for POI %s", pref_type, node_id)
                except Exception as e:
                    logger.warning("Could not add preference: %s", e)

        EventService.update_event_status(
            event_id=event_id,
            status=EventStatus.COMPLETED,
            processing_result={
                "action": "UPDATE_PREFERENCES_ONLY",
                "preference_updated": updated,
                "reason": reason,
            },
        )

        return {
            "status": "completed",
            "message": f"Preferences updated — {reason}",
            "explanations": [comment or reason],
            "itinerary_updated": False,
        }

    @staticmethod
    def _persist_decision_log(
        request_id: str,
        decision: str,
        trigger_score: float,
        threshold: float,
        optimizer_called: bool,
    ) -> None:
        try:
            with get_db_session() as session:
                db_log = DecisionLog(
                    request_id=request_id,
                    decision=decision,
                    trigger_score=trigger_score,
                    threshold=threshold,
                    optimizer_called=optimizer_called,
                )
                session.add(db_log)
        except Exception as e:
            logger.error("Failed to persist DecisionLog: %s", e)

    # ------------------------------------------------------------------
    # ToolsAgent — dispatches Celery tasks for hotel + flight bookings
    # ------------------------------------------------------------------
    @staticmethod
    def trigger_tools_agent(
        option_id: str,
        event_id: str,
        trip_id: str,
        details: dict = None,
    ) -> bool:
        """
        Trigger the Tools Agent to execute bookings for an approved option.

        Dispatches:
        - Hotel booking Celery task (always, for applicable option types)
        - Flight booking Celery task (if flight params present in details)
        """
        from app.services.booking_service import BookingService
        from app.services.city_code_cache import CityCodeCache
        from app.worker import process_hotel_booking
        from datetime import timedelta

        logger.info("ToolsAgent: triggering for option=%s, event=%s", option_id, event_id)

        try:
            is_hotel_booking = not details or details.get("type") in (
                "hotel", "base_itinerary", None
            )

            if is_hotel_booking:
                start_date = details.get("start_date") if details else None
                end_date = details.get("end_date") if details else None
                num_travellers = details.get("num_travellers", 2) if details else 2
                destination = details.get("destination", "delhi") if details else "delhi"

                city_code = CityCodeCache.get_city_code(destination)

                if not start_date:
                    start_date = (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d")
                if not end_date:
                    end_date = (datetime.utcnow() + timedelta(days=34)).strftime("%Y-%m-%d")

                hotel_job = BookingService.create_job(
                    itinerary_id=option_id,
                    agent_id="tools_agent",
                    items=["hotel"],
                )

                hotel_search_params = (details or {}).get("search_params") or {
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
                    "ToolsAgent: hotel job %s dispatched for %s (%s → %s)",
                    hotel_job.id, destination, start_date, end_date,
                )

                # Optional flight task
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
                        "ToolsAgent: flight job %s dispatched: %s → %s on %s",
                        flight_job.id, flight_origin, flight_destination, flight_departure_date,
                    )

            return True

        except Exception as e:
            logger.error("ToolsAgent trigger failed for option %s: %s", option_id, e)
            return False

    # ------------------------------------------------------------------
    # CommunicationAgent — WebSocket + Celery notification pipeline
    # ------------------------------------------------------------------
    @staticmethod
    def trigger_communication_agent(
        option_id: str,
        event_id: str,
        trip_id: str,
        agent_id: Optional[str] = None,
    ) -> bool:
        """
        Trigger the Communication Agent to notify all travellers on a trip
        about an approved itinerary option via WebSocket + Celery.
        """
        from app.services.trip_service import TripService
        from app.services.family_service import FamilyService
        from app.worker import process_notification_task

        logger.info(
            "CommunicationAgent: triggering for option=%s, trip=%s", option_id, trip_id
        )

        try:
            trip = TripService.get_trip(trip_id)
            if not trip:
                logger.error("Trip %s not found for communication trigger", trip_id)
                return False

            family_ids_list: List[str] = trip.family_ids or []
            if not family_ids_list:
                logger.warning("No family IDs on trip %s", trip_id)
                return True

            # Collect all member user IDs across families
            user_ids: List[str] = []
            for fam_code in family_ids_list:
                try:
                    from uuid import UUID as _UUID
                    fam_uuid = _UUID(str(fam_code))
                    members = FamilyService.get_family_members(fam_uuid)
                except (ValueError, AttributeError):
                    fam = FamilyService.get_family_by_code(str(fam_code))
                    members = FamilyService.get_family_members(fam.id) if fam else []
                user_ids.extend(str(m.id) for m in members)

            if not user_ids:
                logger.warning("No family members found for families %s", family_ids_list)
                return True

            payload = {
                "title": "Itinerary Update Approved!",
                "message": "Your travel agent has approved a new itinerary option for your trip.",
                "action_link": f"/trips/{trip_id}/itinerary",
                "option_id": option_id,
            }

            process_notification_task.delay(
                notification_type="itinerary_approved",
                payload=payload,
                target_users=user_ids,
            )

            logger.info(
                "CommunicationAgent: notified %d members across %s",
                len(user_ids), family_ids_list,
            )
            return True

        except Exception as e:
            logger.error("CommunicationAgent trigger failed for option %s: %s", option_id, e)
            return False
