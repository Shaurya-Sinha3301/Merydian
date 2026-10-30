from typing import Dict, Any

from app.travel_context.schemas import TravelContext, TravelConstraint

class OptimizationInputBuilder:
    """
    Acts as a strict boundary between the Travel Domain models and the Optimizer Agent.
    Converts domain context into the raw JSON/dict structures that the optimizer expects.
    """

    @staticmethod
    def build(context: TravelContext, new_constraint: TravelConstraint) -> Dict[str, Any]:
        """
        Build the optimization input payload.
        """
        # The optimizer currently expects `preferences` as an event-like dict,
        # but we can pass the rich constraints here, or map them.
        
        # Build the structured input for the optimizer
        input_payload = {
            "trip_id": context.trip_id,
            "session_data": context.trip_session,
            "families": context.families,
            # We pass constraints and current preferences so the optimizer has all the context
            "constraints": {
                "hard_constraints": new_constraint.hard_constraints,
                "soft_constraints": new_constraint.soft_constraints
            },
            "preferences": context.preferences
        }
        
        return input_payload
