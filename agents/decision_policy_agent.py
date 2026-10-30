import logging
from typing import Optional, Dict, Any, List

from .schemas import FeedbackUnderstanding, PolicyDecision, EventType, ActionType
from app.travel_context.schemas import TravelContext, TravelConstraint, IntentType

logger = logging.getLogger(__name__)


class DecisionPolicyAgent:
    """
    Agent responsible for deciding what action to take based on events and intents.
    Rule-based, no LLM. Context-aware conflict resolution.
    
    Produces structured TravelConstraint objects that map directly to
    optimizer weights via the architecture contracts.
    """
    
    def __init__(self):
        logger.info("DecisionPolicyAgent initialized")
    
    def decide(self, understanding: FeedbackUnderstanding, context: Optional[TravelContext] = None) -> PolicyDecision:
        """
        Make a decision based on the feedback understanding and optional travel context.
        
        Produces a TravelConstraint with:
        - hard_constraints: must_visit, never_visit (boolean POI constraints)
        - soft_constraints: pace, budget_level, hotel_quality, accessibility (influence weights)
        """
        logger.info(f"Making decision for feedback with {len(understanding.existing_events)} events and {len(understanding.travel_intents)} intents")
        
        # Build constraints
        hard_constraints = {}
        soft_constraints = {}
        
        must_visit = []
        never_visit = []
        
        # ─── 1. Process legacy events (MUST/NEVER visit, ratings, transport) ───
        for event in understanding.existing_events:
            if event.event_type == EventType.MUST_VISIT_ADDED and event.poi_id:
                must_visit.append(event.poi_id)
            elif event.event_type == EventType.NEVER_VISIT_ADDED and event.poi_id:
                never_visit.append(event.poi_id)
            elif event.event_type == EventType.TRANSPORT_ISSUE:
                # Map transport issues to disruption constraints
                if event.transport_mode:
                    disruption = {"mode": event.transport_mode}
                    if event.disruption_from_poi:
                        disruption["from"] = event.disruption_from_poi
                    if event.disruption_to_poi:
                        disruption["to"] = event.disruption_to_poi
                    
                    if "transport_disruptions" not in hard_constraints:
                        hard_constraints["transport_disruptions"] = []
                    hard_constraints["transport_disruptions"].append(disruption)
                
        if must_visit:
            hard_constraints["must_visit"] = must_visit
        if never_visit:
            hard_constraints["never_visit"] = never_visit
            
        # ─── 2. Process Travel Intents (with conflict resolution) ───
        pace_requests = []
        budget_requests = []
        hotel_requests = []
        accessibility_flags = {}
        
        for intent in understanding.travel_intents:
            if intent.intent_type == IntentType.PACE_CHANGE:
                pace_requests.append(intent.target or "relaxed")
            elif intent.intent_type == IntentType.BUDGET_CHANGE:
                budget_requests.append(intent.target or "budget")
            elif intent.intent_type == IntentType.HOTEL_CHANGE:
                hotel_requests.append(intent.target or "luxury")
            elif intent.intent_type == IntentType.ACCESSIBILITY_CHANGE:
                # Accessibility is additive, not conflicting
                accessibility_flags["wheelchair_accessible"] = True
            elif intent.intent_type == IntentType.TIME_CHANGE:
                # Map time changes to pace adjustments
                if intent.target and "early" in intent.target.lower():
                    pace_requests.append("active")
                elif intent.target and "late" in intent.target.lower():
                    pace_requests.append("relaxed")
                
        # ─── 3. Resolve conflicts ───
        
        # Pace: if conflicting requests, pick moderate
        if pace_requests:
            if len(set(pace_requests)) > 1:
                soft_constraints["pace"] = "moderate"
            else:
                soft_constraints["pace"] = pace_requests[0]
                
        # Budget: if conflicting, pick moderate
        if budget_requests:
            if len(set(budget_requests)) > 1:
                soft_constraints["budget_level"] = "moderate"
            else:
                soft_constraints["budget_level"] = budget_requests[0]
            
        # Hotel: if conflicting, pick standard
        if hotel_requests:
            if len(set(hotel_requests)) > 1:
                soft_constraints["hotel_quality"] = "standard"
            else:
                soft_constraints["hotel_quality"] = hotel_requests[0]
        
        # Accessibility: always additive
        if accessibility_flags:
            soft_constraints.update(accessibility_flags)
                
        constraint = TravelConstraint(
            hard_constraints=hard_constraints,
            soft_constraints=soft_constraints
        )
        
        # ─── 4. Determine ActionType ───
        requires_optimizer = (
            bool(understanding.travel_intents)
            or bool(must_visit) 
            or bool(never_visit)
            or bool(hard_constraints.get("transport_disruptions"))
        )
        
        if requires_optimizer:
            action = ActionType.RUN_OPTIMIZER
            reason = self._build_reason(must_visit, never_visit, soft_constraints)
        elif understanding.existing_events:
            action = ActionType.UPDATE_PREFERENCES_ONLY
            reason = "Only soft preferences updated (ratings), no re-optimization needed"
        else:
            action = ActionType.NO_ACTION
            reason = "No actionable intents or events found"
            
        return PolicyDecision(
            action=action,
            reason=reason,
            requires_approval=False,
            travel_constraint=constraint,
            event_context=understanding.existing_events[0] if understanding.existing_events else None
        )
    
    @staticmethod
    def _build_reason(must_visit, never_visit, soft_constraints):
        """Build a human-readable reason string."""
        parts = []
        if must_visit:
            parts.append(f"Must-visit POIs added: {must_visit}")
        if never_visit:
            parts.append(f"Never-visit POIs added: {never_visit}")
        if "pace" in soft_constraints:
            parts.append(f"Pace changed to: {soft_constraints['pace']}")
        if "budget_level" in soft_constraints:
            parts.append(f"Budget preference: {soft_constraints['budget_level']}")
        if "hotel_quality" in soft_constraints:
            parts.append(f"Hotel quality: {soft_constraints['hotel_quality']}")
        return "; ".join(parts) if parts else "Travel constraint changed, requiring re-optimization"
