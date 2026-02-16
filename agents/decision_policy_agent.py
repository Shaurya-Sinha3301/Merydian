"""
Decision & Policy Agent - Deterministic decision-making based on event types.
Rule-based, no LLM. This is the "brainstem" of the agent system.
"""
import logging
from typing import Optional

from .schemas import FeedbackEvent, PolicyDecision, EventType, ActionType

logger = logging.getLogger(__name__)


class DecisionPolicyAgent:
    """
    Agent responsible for deciding what action to take based on events.
    Pure Python, deterministic rules, no LLM.
    """
    
    # Event types that require optimizer re-run (hard constraints)
    HARD_CONSTRAINT_EVENTS = {
        EventType.MUST_VISIT_ADDED,
        EventType.NEVER_VISIT_ADDED
    }
    
    # Event types that only update preferences (soft constraints)
    SOFT_PREFERENCE_EVENTS = {
        EventType.POI_RATING,
        EventType.DAY_RATING
    }
    
    # Events acknowledged but not yet handled (future features)
    MOCKED_EVENTS = {
        EventType.DELAY_REPORTED
    }
    
    def __init__(self):
        """Initialize the Decision/Policy Agent."""
        logger.info("DecisionPolicyAgent initialized")
    
    def decide(self, event: FeedbackEvent) -> PolicyDecision:
        """
        Make a decision based on the event type.
        
        Args:
            event: FeedbackEvent from Feedback Agent
        
        Returns:
            PolicyDecision with action and reasoning
        """
        logger.info(f"Making decision for event type: {event.event_type}")
        
        # Hard constraints - must re-run optimizer
        if event.event_type in self.HARD_CONSTRAINT_EVENTS:
            return PolicyDecision(
                action=ActionType.RUN_OPTIMIZER,
                reason=f"Hard constraint changed: {event.event_type}",
                requires_approval=False,
                event_context=event
            )
        
        # Soft preferences - update preferences only
        if event.event_type in self.SOFT_PREFERENCE_EVENTS:
            return PolicyDecision(
                action=ActionType.UPDATE_PREFERENCES_ONLY,
                reason=f"Soft preference updated: {event.event_type}",
                requires_approval=False,
                event_context=event
            )
        
        # Transport issue - re-optimize with disrupted transport graph
        if event.event_type == EventType.TRANSPORT_ISSUE:
            disruption_desc = f"{event.transport_mode} disruption"
            if event.disruption_from_poi and event.disruption_to_poi:
                disruption_desc += f" on route from {event.disruption_from_poi} to {event.disruption_to_poi}"
            else:
                disruption_desc += " (global)"
            
            return PolicyDecision(
                action=ActionType.RUN_OPTIMIZER,
                reason=f"{disruption_desc} requires itinerary re-optimization with updated transport graph",
                requires_approval=False,
                event_context=event
            )
        
        # Mocked events - acknowledge but don't act yet
        if event.event_type in self.MOCKED_EVENTS:
            return PolicyDecision(
                action=ActionType.NO_ACTION,
                reason=f"Event acknowledged but not yet handled: {event.event_type}. "
                       f"The agent system supports these events; optimizer will handle them in future updates.",
                requires_approval=False,
                event_context=event
            )
        
        # Unknown events - no action
        return PolicyDecision(
            action=ActionType.NO_ACTION,
            reason=f"Unknown or unhandled event type: {event.event_type}",
            requires_approval=False,
            event_context=event
        )
    
    def should_run_optimizer(self, event: FeedbackEvent) -> bool:
        """
        Quick check if optimizer should be run (without full decision object).
        
        Args:
            event: FeedbackEvent to check
        
        Returns:
            True if optimizer should run, False otherwise
        """
        return event.event_type in self.HARD_CONSTRAINT_EVENTS


# Test function for standalone execution
if __name__ == "__main__":
    from .feedback_agent import FeedbackAgent
    
    print("=" * 80)
    print("DECISION/POLICY AGENT TEST")
    print("=" * 80)
    
    # Create agents
    feedback_agent = FeedbackAgent()
    policy_agent = DecisionPolicyAgent()
    
    # Test cases
    test_cases = [
        ("We loved Akshardham, we definitely want to visit it tomorrow.", "HARD_CONSTRAINT"),
        ("Please skip the Red Fort, we're not interested.", "HARD_CONSTRAINT"),
        ("I'd rate today a 9 out of 10!", "SOFT_PREFERENCE"),
        ("The Lotus Temple was amazing, 10/10", "SOFT_PREFERENCE"),
        ("We're running 30 minutes late due to traffic", "MOCKED"),
    ]
    
    for user_input, expected_category in test_cases:
        print(f"\nInput: {user_input}")
        print(f"Expected: {expected_category}")
        
        # Parse input
        event = feedback_agent.parse(user_input)
        print(f"Event Type: {event.event_type}")
        
        # Make decision
        decision = policy_agent.decide(event)
        print(f"Action: {decision.action}")
        print(f"Reason: {decision.reason}")
        print("-" * 80)
