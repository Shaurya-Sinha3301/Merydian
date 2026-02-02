"""
Feedback Processor - Stateless processor for handling user feedback.

This is the core processing logic that will be used by:
- Demo script (simulated chat)
- REST API endpoint (website chat)
- WebSocket handler (real-time chat)

The processor is stateless - all state comes from the session manager.

Usage:
    processor = FeedbackProcessor()
    result = processor.process_feedback(
        trip_id="trip_123",
        family_id="FAM_A",
        message="We loved Akshardham!",
        session_manager=session_manager
    )
"""

from typing import Dict, Any
from pathlib import Path
import sys
import json

# Import TripSessionManager from the same directory
from .trip_session_manager import TripSessionManager


class FeedbackProcessor:
    """
    Stateless processor for user feedback.
    
    All state is loaded from and saved to the session manager.
    This makes it compatible with both demo and production environments.
    """
    
    def __init__(self):
        # Import here to avoid circular dependencies
        try:
            from agents.agent_controller import AgentController
            self.controller = AgentController()
            self.use_agents = True
        except ImportError as e:
            print(f"Warning: Could not import AgentController: {e}")
            print("Running in fallback mode without agent processing")
            self.controller = None
            self.use_agents = False
    
    def process_feedback(
        self, 
        trip_id: str, 
        family_id: str, 
        message: str, 
        session_manager: TripSessionManager,
        output_dir: Path
    ) -> Dict[str, Any]:
        """
        Process a single feedback message.
        
        Args:
            trip_id: Unique trip identifier
            family_id: Family providing feedback
            message: Natural language feedback text
            session_manager: Session manager instance
            output_dir: Directory to save outputs
            
        Returns:
            Dictionary with processing results including:
            - success: bool
            - event_type: str
            - action_taken: str
            - explanations: List[str]
            - itinerary_updated: bool
            - iteration: int
        """
        
        # Load session state
        session = session_manager.get_session(trip_id)
        if not session:
            raise ValueError(f"No session found for trip_id: {trip_id}")
        
        # Create iteration output directory
        iteration_dir = output_dir / trip_id / f"iteration_{session.iteration_count + 1}"
        iteration_dir.mkdir(parents=True, exist_ok=True)
        
        # Save current preferences to file (needed by optimizer)
        prefs_path = iteration_dir / "preferences_input.json"
        session_manager.save_preferences_to_file(trip_id, prefs_path)
        
        if not self.use_agents:
            # Fallback mode - simulate processing
            return self._fallback_processing(
                message, family_id, session, session_manager, iteration_dir
            )
        
        # Process through agent controller
        # Get the latest optimized itinerary from previous iteration (for comparison)
        previous_solution = session_manager.get_latest_itinerary(trip_id)
        
        result = self.controller.process_user_input(
            user_input=message,
            context={
                "family_id": family_id,
                "trip_id": trip_id,
                "current_preferences_path": str(prefs_path),
                "base_itinerary": session.baseline_itinerary_path,  # Skeleton stays same
                "previous_solution": str(previous_solution) if previous_solution else None,  # For comparison
                "output_dir": str(iteration_dir)
            }
        )
        
        # Record feedback in session
        session.add_feedback(
            text=message,
            family_id=family_id,
            event_type=result['event'].event_type
        )
        
        # If optimizer ran, update preferences and itinerary
        itinerary_updated = False
        if result.get('optimizer_output'):
            # Update preferences in session (cumulative)
            session_manager.update_preferences(
                trip_id=trip_id,
                family_id=family_id,
                event_type=result['event'].event_type,
                poi_id=result['event'].poi_id
            )
            
            # Copy optimizer outputs to iteration directory for visibility
            import shutil
            optimizer_outputs = result['optimizer_output']
            
            # Copy family preferences (the source of truth from OptimizerAgent)
            if optimizer_outputs.get('family_preferences'):
                prefs_src = Path(optimizer_outputs['family_preferences'])
                prefs_dst = iteration_dir / "family_preferences_updated.json"
                if prefs_src.exists() and prefs_src.resolve() != prefs_dst.resolve():
                    shutil.copy(prefs_src, prefs_dst)
            
            # Copy optimized solution (skip if already in place)
            if optimizer_outputs.get('optimized_solution'):
                solution_src = Path(optimizer_outputs['optimized_solution'])
                solution_dst = iteration_dir / "optimized_solution.json"
                if solution_src.exists() and solution_src.resolve() != solution_dst.resolve():
                    shutil.copy(solution_src, solution_dst)
            
            # Copy LLM payloads (important for explainability)
            if optimizer_outputs.get('llm_payloads'):
                payloads_src = Path(optimizer_outputs['llm_payloads'])
                payloads_dst = iteration_dir / "llm_payloads.json"
                if payloads_src.exists() and payloads_src.resolve() != payloads_dst.resolve():
                    shutil.copy(payloads_src, payloads_dst)
            
            # Copy enriched diffs
            if optimizer_outputs.get('enriched_diffs'):
                diffs_src = Path(optimizer_outputs['enriched_diffs'])
                diffs_dst = iteration_dir / "enriched_diffs.json"
                if diffs_src.exists() and diffs_src.resolve() != diffs_dst.resolve():
                    shutil.copy(diffs_src, diffs_dst)
            
            # Copy decision traces
            if optimizer_outputs.get('decision_traces'):
                traces_src = Path(optimizer_outputs['decision_traces'])
                traces_dst = iteration_dir / "decision_traces.json"
                if traces_src.exists() and traces_src.resolve() != traces_dst.resolve():
                    shutil.copy(traces_src, traces_dst)
           
            # Record new itinerary
            session.update_itinerary(result['optimizer_output']['optimized_solution'])
            session_manager._save_session(session)
            itinerary_updated = True
            
            # Save explanations if generated
            if result.get('explanations'):
                self._save_explanations(result['explanations'], iteration_dir)
        
        return {
            "success": True,
            "event_type": result['event'].event_type,
            "action_taken": result['decision'].action,
            "explanations": [exp.summary for exp in result.get('explanations', [])],
            "itinerary_updated": itinerary_updated,
            "iteration": session.iteration_count,
            "output_dir": str(iteration_dir)
        }
    
    def _save_explanations(self, explanations: list, output_dir: Path):
        """Save explanations to markdown file."""
        exp_path = output_dir / "explanations.md"
        
        with open(exp_path, 'w', encoding='utf-8') as f:
            f.write(f"# Optimization Explanations\n\n")
            f.write(f"Generated: {Path(output_dir).name}\n\n")
            
            for i, explanation in enumerate(explanations, 1):
                f.write(f"## Change {i}\n\n")
                f.write(f"{explanation.summary}\n\n")
                f.write("---\n\n")
    
    def _fallback_processing(
        self, 
        message: str, 
        family_id: str, 
        session: Any,
        session_manager: TripSessionManager,
        output_dir: Path
    ) -> Dict[str, Any]:
        """Fallback processing when agents are not available.""" 
        
        # Simple keyword matching
        event_type = "UNKNOWN"
        poi_id = None
        
        if "want" in message.lower() or "loved" in message.lower():
            event_type = "MUST_VISIT_ADDED"
            # Try to extract POI ID (very simple)
            if "akshardham" in message.lower():
                poi_id = "LOC_006"
        elif "not interested" in message.lower() or "skip" in message.lower():
            event_type = "NEVER_VISIT_ADDED"
            if "lodhi" in message.lower():
                poi_id = "LOC_013"
        
        return {
            "success": True,
            "event_type": event_type,
            "action_taken": "ACKNOWLEDGED_FALLBACK",
            "explanations": [f"Received feedback (demo mode): {message}"],
            "itinerary_updated": False,
            "iteration": session.iteration_count,
            "output_dir": str(output_dir)
        }
