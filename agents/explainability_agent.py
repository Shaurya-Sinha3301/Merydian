"""
Explainability Agent - Converts decision payloads into human-readable summaries.
Uses Google Gemini to generate natural language explanations.
"""
import logging
import json
from typing import Dict, Any, List

from .config import Config
from .llm_client import get_llm_client
from .schemas import AgentExplanation

logger = logging.getLogger(__name__)


class ExplainabilityAgent:
    """
    Agent responsible for generating human-readable explanations.
    Processes decision payloads from the explainability pipeline.
    """
    
    def __init__(self):
        """Initialize the Explainability Agent with Gemini API."""
        try:
            Config.validate()
        except ValueError as e:
            logger.warning(f"Config validation failed: {e}")
            logger.warning("Using demo mode with simple templates")
            self.demo_mode = True
            self.model = None
            return
            
        self.client = get_llm_client()
        self.model_name = Config.GROQ_MODEL
        self.demo_mode = False
        logger.info(f"ExplainabilityAgent initialized with model: {Config.GROQ_MODEL}")
    
    def explain(self, payload: Dict[str, Any]) -> AgentExplanation:
        """
        Generate a human-readable explanation from a decision payload.
        
        Args:
            payload: Decision payload from the explainability pipeline
        
        Returns:
            AgentExplanation with summary text
        """
        logger.info("Generating explanation from payload...")
        
        if self.demo_mode:
            return self._demo_explain(payload)
        
        try:
            prompt = self._build_prompt(payload)
            
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0,
            )
            summary = response.choices[0].message.content.strip()
            
            return AgentExplanation(
                summary=summary,
                payload_source=payload
            )
            
        except Exception as e:
            logger.error(f"Error generating explanation: {e}")
            return AgentExplanation(
                summary=f"Error generating explanation: {str(e)}",
                payload_source=payload
            )
    
    def explain_batch(self, payloads: List[Dict[str, Any]]) -> List[AgentExplanation]:
        """
        Generate explanations for multiple payloads.
        
        Args:
            payloads: List of decision payloads
        
        Returns:
            List of AgentExplanations
        """
        return [self.explain(payload) for payload in payloads]
    
    def _build_prompt(self, payload: Dict[str, Any]) -> str:
        """Build the prompt for Groq API with causal tag explanations."""
        
        payload_str = json.dumps(payload, indent=2)
        
        prompt = f"""You are an explainability agent for a travel itinerary optimization system. Your job is to convert technical decision payloads into clear, concise, human-readable explanations.

Decision Payload:
{payload_str}

CAUSAL TAG DEFINITIONS (use these to explain WHY changes happened):
- SHARED_ANCHOR_REQUIRED: This POI serves as a skeletal/anchor point that enables coordination between multiple families traveling together
- INTEREST_VECTOR_DOMINANCE: This POI matches the family's interest tags very strongly (interest score > 1.2)
- LOW_INTEREST_DROPPED: This POI was removed because it has low relevance to the family's interests (score < 0.8)
- OBJECTIVE_DOMINATED: This POI was removed due to optimization tradeoffs (cost, time, or other constraints)

Generate a brief, clear explanation (1-2 sentences) that describes:
1. What changed in the itinerary (which POI, which day, which family)
2. Why it changed (use the causal_tags to explain the reason)
3. If available, mention the cost impact or satisfaction gain

Guidelines:
- Write in active voice for travelers/travel agents
- Be concise and specific
- Translate causal tags into natural language (don't say "SHARED_ANCHOR_REQUIRED", say "needed for group coordination")
- Include actual POI names from the payload
- Mention costs/satisfaction when relevant
- Don't mention technical field names

Return ONLY the explanation text, nothing else."""
        
        return prompt
    
    def _demo_explain(self, payload: Dict[str, Any]) -> AgentExplanation:
        """Simple template-based explanation (fallback when no API key)."""
        
        # Extract common fields
        change_type = payload.get("change_type", "unknown")
        poi_name = payload.get("poi_name", "location")
        day = payload.get("day", "?")
        
        # Simple template
        if change_type == "visit_added":
            summary = f"Added {poi_name} to Day {day} visit list based on updated preferences."
        elif change_type == "visit_removed":
            summary = f"Removed {poi_name} from Day {day} visit list based on updated preferences."
        else:
            summary = f"Modified itinerary: {change_type} for {poi_name} on Day {day}."
        
        return AgentExplanation(
            summary=summary,
            payload_source=payload
        )


# Test function for standalone execution
if __name__ == "__main__":
    print("=" * 80)
    print("EXPLAINABILITY AGENT TEST")
    print("=" * 80)
    
    agent = ExplainabilityAgent()
    
    # Test payloads
    test_payloads = [
        {
            "change_type": "visit_added",
            "poi_name": "Akshardham Temple",
            "day": 2,
            "reason": "User expressed strong interest",
            "details": {
                "preference_score": 9.2,
                "confidence": "HIGH"
            }
        },
        {
            "change_type": "visit_removed",
            "poi_name": "Red Fort",
            "day": 1,
            "reason": "User requested to skip",
            "details": {
                "constraint_type": "never_visit"
            }
        },
        {
            "change_type": "time_adjusted",
            "poi_name": "Lotus Temple",
            "day": 3,
            "reason": "Optimized for better routing",
            "details": {
                "old_time": "14:00",
                "new_time": "10:00"
            }
        }
    ]
    
    for i, payload in enumerate(test_payloads, 1):
        print(f"\nTest Case {i}:")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        explanation = agent.explain(payload)
        print(f"\nExplanation: {explanation.summary}")
        print("-" * 80)
