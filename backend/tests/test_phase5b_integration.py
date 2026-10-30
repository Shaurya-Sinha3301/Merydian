import pytest
import uuid
from app.travel_context.schemas import TravelContext, TravelConstraint
from app.travel_context.travel_context_service import TravelContextService
from agents.feedback_agent import FeedbackAgent
from agents.decision_policy_agent import DecisionPolicyAgent
from app.travel_context.optimization_input_builder import OptimizationInputBuilder

@pytest.fixture
def mock_context():
    return TravelContext(
        trip_id="test_trip_1",
        trip_session={"status": "active"},
        families=["FAM_A"],
        preferences={"FAM_A": {"must_visit": []}},
        feedback_history=[],
        current_itinerary={"days": []}
    )

def test_feedback_agent_parsing():
    agent = FeedbackAgent()
    understanding = agent.parse("Day 2 is too rushed, and we must visit the Red Fort.")
    
    assert understanding is not None
    assert len(understanding.travel_intents) > 0
    
    intent_types = [i.intent_type for i in understanding.travel_intents]
    assert "PACE_CHANGE" in intent_types
    assert "MUST_VISIT" in intent_types

def test_decision_policy_agent(mock_context):
    agent = FeedbackAgent()
    understanding = agent.parse("We want cheaper options and more sightseeing")
    
    policy_agent = DecisionPolicyAgent()
    decision = policy_agent.decide(mock_context, understanding.travel_intents)
    
    assert decision.constraint is not None
    assert "BUDGET" in decision.constraint.soft_constraints
    assert "ACTIVITY_STYLE" in decision.constraint.soft_constraints

def test_optimization_input_builder(mock_context):
    constraint = TravelConstraint(
        hard_constraints={"must_visit": ["poi_123"]},
        soft_constraints={"pace": "relaxed"}
    )
    
    payload = OptimizationInputBuilder.build(mock_context, constraint)
    
    assert payload["trip_id"] == "test_trip_1"
    assert "constraints" in payload
    assert payload["constraints"]["hard_constraints"]["must_visit"] == ["poi_123"]
