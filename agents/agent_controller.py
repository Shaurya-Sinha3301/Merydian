"""
Agent Controller - Orchestrates all agents in a deterministic flow.
This is the conductor that coordinates the entire agent system.
"""
import logging
import time
from typing import Dict, Any, Optional
from pathlib import Path

from .config import Config
from .schemas import FeedbackEvent, PolicyDecision, ActionType
from .feedback_agent import FeedbackAgent
from .decision_policy_agent import DecisionPolicyAgent
from .optimizer_agent import OptimizerAgent
from .explainability_agent import ExplainabilityAgent

logger = logging.getLogger(__name__)


class AgentController:
    """
    Main orchestration layer for the agent system.
    Implements the core flow: User Input → Event → Decision → Action → Explanation
    """
    
    def __init__(self):
        """Initialize the agent controller and all agents."""
        logger.info("Initializing AgentController...")
        
        self.feedback_agent = FeedbackAgent()
        self.policy_agent = DecisionPolicyAgent()
        self.optimizer_agent = OptimizerAgent()
        self.explainability_agent = ExplainabilityAgent()
        
        logger.info("AgentController initialized successfully")
    
    def process_user_input(
        self,
        user_input: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process user input through the complete agent pipeline.
        
        Args:
            user_input: Natural language text from user
            context: Optional context (family_id, current_day, etc.)
        
        Returns:
            Dictionary with results from each stage:
            - event: Parsed FeedbackEvent
            - decision: PolicyDecision
            - optimizer_output: Paths to generated files (if optimizer ran)
            - explanations: List of explanations (if available)
        """
        logger.info("=" * 80)
        logger.info(f"Processing user input: '{user_input}'")
        logger.info("=" * 80)
        
        # Stage 1: Parse user input into structured event
        logger.info("\n[STAGE 1] Feedback Agent - Parsing user input...")
        event = self.feedback_agent.parse(user_input, context)
        logger.info(f"✓ Event generated: {event.event_type} (confidence: {event.confidence})")
        
        # Stage 2: Decide what action to take
        logger.info("\n[STAGE 2] Decision/Policy Agent - Making decision...")
        decision = self.policy_agent.decide(event)
        logger.info(f"✓ Decision: {decision.action}")
        logger.info(f"  Reason: {decision.reason}")
        
        result = {
            "event": event,
            "decision": decision,
            "optimizer_output": None,
            "explanations": []
        }
        
        # Stage 3: Execute action based on decision
        if decision.action == ActionType.RUN_OPTIMIZER:
            logger.info("\n[STAGE 3] Optimizer Agent - Running optimizer...")
            
            # Run optimizer
            optimizer_output = self.optimizer_agent.run()
            result["optimizer_output"] = optimizer_output
            logger.info(f"✓ Optimizer completed")
            
            # Stage 4: Generate explanations
            logger.info("\n[STAGE 4] Explainability Agent - Generating explanations...")
            
            # Load enriched diffs if available
            if optimizer_output.get("enriched_diffs") and \
               optimizer_output["enriched_diffs"].exists():
                diffs = self.optimizer_agent.load_enriched_diffs(
                    optimizer_output["enriched_diffs"]
                )
                
                # Generate explanations for each change
                # For demo, we'll create sample payloads
                # In production, these would come from your explainability pipeline
                sample_payloads = self._extract_payloads_from_diffs(diffs)
                
                explanations = self.explainability_agent.explain_batch(sample_payloads)
                result["explanations"] = explanations
                
                logger.info(f"✓ Generated {len(explanations)} explanations")
                
                # Display explanations
                for i, exp in enumerate(explanations, 1):
                    logger.info(f"  {i}. {exp.summary}")
        
        elif decision.action == ActionType.UPDATE_PREFERENCES_ONLY:
            logger.info("\n[STAGE 3] Updating preferences (optimizer not run)")
            logger.info("  Preference update acknowledged")
        
        else:
            logger.info(f"\n[STAGE 3] No action required")
            logger.info(f"  {decision.reason}")
        
        logger.info("\n" + "=" * 80)
        logger.info("Pipeline completed successfully")
        logger.info("=" * 80 + "\n")
        
        return result
    
    def _extract_payloads_from_diffs(self, diffs: Dict[str, Any]) -> list:
        """
        Extract explanation payloads from enriched diffs.
        This is a simplified version for demo purposes.
        
        Args:
            diffs: Enriched diffs data
        
        Returns:
            List of payload dictionaries
        """
        payloads = []
        
        # For demo, create a sample payload
        # In production, this would parse the actual diffs structure
        payloads.append({
            "change_type": "itinerary_optimized",
            "poi_name": "Sample Location",
            "day": 1,
            "reason": "Preferences updated based on user feedback"
        })
        
        return payloads
    
    def run_demo_scenarios(self):
        """Run a set of demo scenarios to showcase the system."""
        print("\n" + "=" * 80)
        print("AGENT SYSTEM DEMO - RUNNING SCENARIOS")
        print("=" * 80 + "\n")
        
        scenarios = [
            {
                "input": "We loved Akshardham, we definitely want to visit it tomorrow.",
                "context": {"family_id": "FAM_B"},
                "description": "User adds a must-visit location"
            },
            {
                "input": "Please skip the Red Fort, we're not interested.",
                "context": {"family_id": "FAM_A"},
                "description": "User excludes a location"
            },
            {
                "input": "I'd rate today a 9 out of 10!",
                "context": {"family_id": "FAM_C", "day": 1},
                "description": "User provides day rating (soft preference)"
            },
            {
                "input": "We're running 30 minutes late due to traffic",
                "context": None,
                "description": "Delay reported (mocked - not yet handled)"
            }
        ]
        
        for i, scenario in enumerate(scenarios, 1):
            print(f"\n{'#' * 80}")
            print(f"SCENARIO {i}: {scenario['description']}")
            print(f"{'#' * 80}\n")
            print(f"User: \"{scenario['input']}\"\n")
            
            result = self.process_user_input(
                scenario["input"],
                scenario["context"]
            )
            
            # Display summary
            print("\n--- SUMMARY ---")
            print(f"Event Type: {result['event'].event_type}")
            print(f"Decision: {result['decision'].action}")
            print(f"Optimizer Run: {'Yes' if result['optimizer_output'] else 'No'}")
            if result['explanations']:
                print(f"Explanations Generated: {len(result['explanations'])}")
            
            # Don't wait after the last scenario
            if i < len(scenarios):
                print("\n⏱️  Waiting 35 seconds before next scenario (free tier rate limiting)...")
                time.sleep(35)  # Ensure we stay within 2 RPM globally
                print("Ready for next scenario!\n")
        
        print("\n" + "=" * 80)
        print("DEMO COMPLETED")
        print("=" * 80 + "\n")


# Main execution
if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("VOYAGEUR AGENT SYSTEM - CONTROLLER TEST")
    print("=" * 80)
    
    controller = AgentController()
    
    # Run demo scenarios
    controller.run_demo_scenarios()
