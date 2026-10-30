"""
Feedback Agent - Converts natural language user input into structured events.
Uses Google Gemini to parse free-form text and extract meaningful events.
"""
import logging
import json
from typing import Optional

from .config import Config
from .llm_client import get_llm_client
from .schemas import FeedbackEvent, EventType, ConfidenceLevel, FeedbackUnderstanding
from app.travel_context.schemas import TravelIntent, IntentType, IntentScope

logger = logging.getLogger(__name__)


class FeedbackAgent:
    """
    Agent responsible for parsing user feedback into structured events.
    This is the ONLY place where free-form language enters the system.
    """
    
    def __init__(self):
        """Initialize the Feedback Agent with Gemini API."""
        try:
            Config.validate()
        except ValueError as e:
            logger.warning(f"Config validation failed: {e}")
            logger.warning("Using demo mode with mock responses")
            self.demo_mode = True
            self.model = None
            return
            
        self.client = get_llm_client()
        self.model_name = Config.GROQ_MODEL
        self.demo_mode = False
        logger.info(f"FeedbackAgent initialized with model: {Config.GROQ_MODEL}")
    
    def parse(self, user_input: str, context: Optional[dict] = None) -> FeedbackUnderstanding:
        """
        Parse user input into a structured understanding of intents and events.
        
        Args:
            user_input: Natural language text from the user
            context: Optional context (family_id, current_day, etc.)
        
        Returns:
            FeedbackUnderstanding with structured data
        """
        logger.info(f"Parsing user input: '{user_input}'")
        
        if self.demo_mode:
            return self._demo_parse(user_input, context)
        
        try:
            prompt = self._build_prompt(user_input, context)
            
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0,
            )
            response_text = response.choices[0].message.content.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith("```"):
                # Find the actual JSON content
                lines = response_text.split("\n")
                json_lines = [line for line in lines if not line.startswith("```")]
                response_text = "\n".join(json_lines).strip()
            
            # Parse the JSON
            parsed_data = json.loads(response_text)
            
            # Construct nested structures
            existing_events_data = parsed_data.get("existing_events", [])
            travel_intents_data = parsed_data.get("travel_intents", [])
            
            existing_events = []
            for ev in existing_events_data:
                ev["raw_input"] = user_input
                existing_events.append(FeedbackEvent(**ev))
                
            travel_intents = []
            for intent in travel_intents_data:
                travel_intents.append(TravelIntent(**intent))
            
            understanding = FeedbackUnderstanding(
                existing_events=existing_events,
                travel_intents=travel_intents
            )
            logger.info(f"Successfully parsed feedback understanding.")
            
            return understanding
            
        except Exception as e:
            logger.error(f"Error parsing user input: {e}")
            # Return a fallback understanding
            fallback_event = FeedbackEvent(
                event_type=EventType.UNKNOWN,
                confidence=ConfidenceLevel.LOW,
                raw_input=user_input,
                metadata={"error": str(e)}
            )
            return FeedbackUnderstanding(existing_events=[fallback_event], travel_intents=[])
    
    def _build_prompt(self, user_input: str, context: Optional[dict]) -> str:
        """Build the prompt for Gemini API."""
        
        context_str = ""
        if context:
            context_str = f"\n\nContext information: {json.dumps(context, indent=2)}"
        
        prompt = f"""You are a travel itinerary feedback parser. Your job is to convert natural language user feedback into a structured JSON understanding containing both legacy events and new travel intents.

User Input: "{user_input}"{context_str}

Extract the following information and return ONLY valid JSON (no markdown, no explanation):

{{
  "existing_events": [
    {{
      "event_type": "MUST_VISIT_ADDED" | "NEVER_VISIT_ADDED" | "POI_RATING" | "DAY_RATING" | "DELAY_REPORTED" | "TRANSPORT_ISSUE" | "UNKNOWN",
      "family_id": "FAM_A" | null,
      "poi_id": "LOC_XXX" or null if not identifiable,
      "poi_name": "Name of the place" or null,
      "rating": 0-10 number or null,
      "day": integer or null,
      "transport_mode": "BUS" | "METRO" | "AUTO" | "CAB" | null,
      "disruption_from_poi": "POI name or LOC_XXX" | null,
      "disruption_to_poi": "POI name or LOC_XXX" | null,
      "confidence": "HIGH" | "MEDIUM" | "LOW"
    }}
  ],
  "travel_intents": [
    {{
      "intent_type": "PACE_CHANGE" | "BUDGET_CHANGE" | "HOTEL_CHANGE" | "LOCATION_CHANGE" | "ACTIVITY_CHANGE" | "ACCESSIBILITY_CHANGE" | "TIME_CHANGE",
      "target": "string or null",
      "strength": float between -1.0 and 1.0,
      "family_id": "FAM_A" | null,
      "metadata": {{}},
      "scope": "GLOBAL_TRIP" | "SPECIFIC_DAY" | "SPECIFIC_LOCATION"
    }}
  ]
}}

Guidelines for existing_events:
- MUST_VISIT_ADDED: "must", "definitely want", "loved it"
- NEVER_VISIT_ADDED: "skip", "avoid", "don't want"
- POI_RATING, DAY_RATING, DELAY_REPORTED, TRANSPORT_ISSUE
- Only output if it matches these strict categories.

Guidelines for travel_intents (New Intents):
- PACE_CHANGE: "Too rushed", "Too slow", "Tomorrow should be lighter". Set target to e.g. "slower". Set scope to SPECIFIC_DAY if they say "tomorrow" or "today".
- BUDGET_CHANGE: "Too expensive", "Need cheaper hotels".
- HOTEL_CHANGE: "Want luxury hotels".
- ACTIVITY_CHANGE: "More adventure".
- If the text is "Day too rushed", create PACE_CHANGE with scope SPECIFIC_DAY.

You can return multiple events and intents if the user input contains multiple distinct requests.
Return ONLY the JSON object, nothing else."""
        
        return prompt
    
    def _demo_parse(self, user_input: str, context: Optional[dict]) -> FeedbackUnderstanding:
        """Simple demo parsing using keyword matching (fallback when no API key)."""
        
        user_lower = user_input.lower()
        events = []
        intents = []
        
        # Simple keyword-based parsing
        if any(word in user_lower for word in ["must", "definitely", "loved", "want to visit"]):
            events.append(FeedbackEvent(
                event_type=EventType.MUST_VISIT_ADDED, confidence=ConfidenceLevel.HIGH, raw_input=user_input, family_id=context.get("family_id") if context else None
            ))
        elif any(word in user_lower for word in ["skip", "avoid", "don't want", "never", "not interested"]):
            events.append(FeedbackEvent(
                event_type=EventType.NEVER_VISIT_ADDED, confidence=ConfidenceLevel.HIGH, raw_input=user_input, family_id=context.get("family_id") if context else None
            ))
        elif "expensive" in user_lower or "budget" in user_lower or "cheap" in user_lower:
            intents.append(TravelIntent(
                intent_type=IntentType.BUDGET_CHANGE, scope=IntentScope.GLOBAL_TRIP, family_id=context.get("family_id") if context else None
            ))
        elif "rushed" in user_lower or "slow" in user_lower or "lighter" in user_lower:
            scope = IntentScope.SPECIFIC_DAY if "tomorrow" in user_lower or "today" in user_lower or "day" in user_lower else IntentScope.GLOBAL_TRIP
            intents.append(TravelIntent(
                intent_type=IntentType.PACE_CHANGE, target="slower", scope=scope, family_id=context.get("family_id") if context else None
            ))
        else:
            events.append(FeedbackEvent(
                event_type=EventType.UNKNOWN, confidence=ConfidenceLevel.LOW, raw_input=user_input, family_id=context.get("family_id") if context else None
            ))
        
        return FeedbackUnderstanding(existing_events=events, travel_intents=intents)


# Test function for standalone execution
if __name__ == "__main__":
    agent = FeedbackAgent()
    
    # Test cases
    test_inputs = [
        "We loved Akshardham, we definitely want to visit it tomorrow.",
        "Please skip the Red Fort, we're not interested.",
        "I'd rate today a 9 out of 10!",
        "The Lotus Temple was amazing, 10/10",
        "We're running 30 minutes late due to traffic"
    ]
    
    print("=" * 80)
    print("FEEDBACK AGENT TEST")
    print("=" * 80)
    
    for test_input in test_inputs:
        print(f"\nInput: {test_input}")
        event = agent.parse(test_input)
        print(f"Event Type: {event.event_type}")
        print(f"Confidence: {event.confidence}")
        print(f"Full Event: {event.model_dump_json(indent=2)}")
        print("-" * 80)
