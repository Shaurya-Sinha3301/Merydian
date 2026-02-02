"""
Re-Optimization Demo with Agentic Workflow Integration

This demo showcases the itinerary re-optimization pipeline using the agentic system:
- FeedbackAgent: Processes natural language feedback
- OptimizerAgent: Runs itinerary optimization
- ExplainabilityAgent: Generates human-readable explanations

The demo simulates a chat interface where families provide feedback about
their itinerary, and the system responds with optimizations and explanations.

Architecture:
- Session-based state management (compatible with production)
- Stateless feedback processing (same code as API endpoints)  
- Cumulative preference updates (all constraints persist)

Usage:
    python ml_or/demos/reopt_hard_constraints/run_demo.py
"""

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

# Add project root to path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from ml_or.demos.reopt_hard_constraints.trip_session_manager import TripSessionManager
from ml_or.demos.reopt_hard_constraints.feedback_processor import FeedbackProcessor


class ReoptimizationDemo:
    """
    Demo harness that simulates a website chat interface.
    
    This demonstrates how chat messages from a website would be processed
    using the same logic that will be used in production API endpoints.
    """
    
    def __init__(self):
        self.demo_dir = Path(__file__).parent
        self.data_dir = self.demo_dir / "data"
        self.output_dir = self.demo_dir / "output"
        self.output_dir.mkdir(exist_ok=True)
        
        # Session management (file-based for demo)
        self.session_manager = TripSessionManager(
            storage_dir=self.output_dir / "sessions"
        )
        
        # Stateless processor (production-ready)
        self.processor = FeedbackProcessor()
        
        # Demo trip ID
        self.demo_trip_id = f"demo_trip_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # File paths
        self.locations_file = project_root / "ml_or" / "data" / "locations.json"
        self.base_itinerary_file = str(project_root / "ml_or" / "data" / "base_itinerary_final.json")
    
    def run(self):
        """Execute demo with simulated chat messages."""
        
        print("\n" + "="*80)
        print("  RE-OPTIMIZATION DEMO - AGENTIC WORKFLOW")
        print("="*80)
        print("\nThis demo simulates a chat interface where families provide feedback")
        print("and the system responds with optimized itineraries and explanations.\n")
        
        # Phase 0: Initialize session
        print("\n" + "="*80)
        print("PHASE 0: INITIALIZE TRIP SESSION")
        print("="*80)
        
        baseline_prefs = self._load_baseline_preferences()
        session = self.session_manager.create_session(
            trip_id=self.demo_trip_id,
            family_ids=["FAM_A", "FAM_B", "FAM_C"],
            baseline_prefs=baseline_prefs,
            baseline_itinerary_path=self.base_itinerary_file
        )
        
        print(f"\nTrip ID: {self.demo_trip_id}")
        print(f"Families: {', '.join(session.family_ids)}")
        print(f"Baseline Itinerary: {session.baseline_itinerary_path}")
        print(f"Session Storage: {self.session_manager.storage_dir}")
        
        # Phase 1: Generate baseline itinerary
        print("\n" + "="*80)
        print("PHASE 1: GENERATE BASELINE ITINERARY")
        print("="*80)
        
        baseline_result = self._generate_baseline()
        if baseline_result:
            print(f"\nBaseline itinerary generated successfully!")
            print(f"Saved to: {baseline_result}")
            
            # Update session with baseline
            session.update_itinerary(Path(baseline_result))
            self.session_manager._save_session(session)
        
        # Phase 2: Process feedback - Must Visit
        print("\n" + "="*80)
        print("PHASE 2: CHAT MESSAGE - MUST VISIT REQUEST")
        print("="*80)
        
        self._simulate_chat_message(
            family_id="FAM_A",
            message="We loved Akshardham, we definitely want to visit it tomorrow.",
            phase_name="must_visit"
        )
        
        # Phase 3: Process feedback - Never Visit
        print("\n" + "="*80)
        print("PHASE 3: CHAT MESSAGE - NEVER VISIT REQUEST")
        print("="*80)
        
        # Detect a POI to exclude (from latest itinerary)
        latest_itinerary = self.session_manager.get_latest_itinerary(self.demo_trip_id)
        detected_poi = self._detect_branch_poi(latest_itinerary)
        poi_name = self._get_poi_name(detected_poi) if detected_poi else "Lodhi Gardens"
        
        self._simulate_chat_message(
            family_id="FAM_B",
            message=f"We're not interested in {poi_name}, please skip it.",
            phase_name="never_visit"
        )
        
        # Summary
        print("\n" + "="*80)
        print("DEMO COMPLETE")
        print("="*80)
        
        final_session = self.session_manager.get_session(self.demo_trip_id)
        print(f"\nTotal Iterations: {final_session.iteration_count}")
        print(f"Feedback Messages: {len(final_session.feedback_history)}")
        print(f"\nOutput Directory: {self.output_dir / self.demo_trip_id}")
        
        # Show cumulative preferences
        print("\nFinal Cumulative Preferences:")
        for fam in final_session.current_preferences:
            must_visit = fam.get('must_visit_locations', [])
            never_visit = fam.get('never_visit_locations', [])
            if must_visit or never_visit:
                print(f"  {fam['family_id']}:")
                if must_visit:
                    print(f"    Must Visit: {must_visit}")
                if never_visit:
                    print(f"    Never Visit: {never_visit}")
        
        print("\n" + "="*80 + "\n")
    
    def _simulate_chat_message(self, family_id: str, message: str, phase_name: str):
        """
        Simulate a chat message from the website.
        
        In production, this would be an incoming POST request to /api/feedback
        or a WebSocket message.
        """
        print(f"\n{'[CHAT MESSAGE]':<20} {family_id}")
        print(f"{'Message:':<20} \"{message}\"")
        print(f"\n{'[PROCESSING]':<20} Using AgentController pipeline...")
        
        try:
            # Process feedback (same logic as production API)
            result = self.processor.process_feedback(
                trip_id=self.demo_trip_id,
                family_id=family_id,
                message=message,
                session_manager=self.session_manager,
                output_dir=self.output_dir
            )
            
            # Display results
            print(f"\n{'[RESULT]':<20} Event Type: {result['event_type']}")
            print(f"{'[RESULT]':<20} Action: {result['action_taken']}")
            print(f"{'[RESULT]':<20} Itinerary Updated: {result['itinerary_updated']}")
            print(f"{'[RESULT]':<20} Iteration: {result['iteration']}")
            
            if result.get('explanations'):
                print(f"\n{'[EXPLANATIONS]':<20}")
                for exp in result['explanations']:
                    print(f"  - {exp}")
            
            print(f"\n{'[OUTPUT]':<20} {result['output_dir']}")
            
        except Exception as e:
            print(f"\n{'[ERROR]':<20} {str(e)}")
            import traceback
            traceback.print_exc()
    
    def _generate_baseline(self) -> str:
        """Generate baseline itinerary using optimizer."""
        from ml_or.itinerary_optimizer import ItineraryOptimizer
        
        # Create baseline output directory
        baseline_dir = self.output_dir / self.demo_trip_id / "iteration_0_baseline"
        baseline_dir.mkdir(parents=True, exist_ok=True)
        
        # Save baseline preferences
        prefs_path = baseline_dir / "preferences.json"
        session = self.session_manager.get_session(self.demo_trip_id)
        with open(prefs_path, 'w', encoding='utf-8') as f:
            json.dump(session.current_preferences, f, indent=2)
        
        try:
            # Run optimizer
            optimizer = ItineraryOptimizer(
                locations_file=str(self.locations_file),
                transport_file=str(project_root / "ml_or" / "data" / "transport_graph.json"),
                base_itinerary_file=self.base_itinerary_file,
                family_prefs_file=str(prefs_path)
            )
            
            solution = optimizer.optimize_trip(
                family_ids=["FAM_A", "FAM_B", "FAM_C"],
                num_days=3,
                lambda_divergence=100.0
            )
            
            # Save solution
            solution_path = baseline_dir / "itinerary.json"
            with open(solution_path, 'w', encoding='utf-8') as f:
                json.dump(solution, f, indent=2)
            
            # Also save to root for easy access
            baseline_link = self.output_dir / "itinerary_v0_baseline.json"
            with open(baseline_link, 'w', encoding='utf-8') as f:
                json.dump(solution, f, indent=2)
            
            return str(solution_path)
            
        except Exception as e:
            print(f"Error generating baseline: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def _load_baseline_preferences(self) -> List[Dict[str, Any]]:
        """Load baseline family preferences."""
        baseline_path = self.data_dir / "family_preferences_baseline.json"
        
        with open(baseline_path, 'r', encoding='utf-8') as f:
            prefs = json.load(f)
        
        # Ensure all families have constraint lists
        for fam in prefs:
            if 'must_visit_locations' not in fam:
                fam['must_visit_locations'] = []
            if 'never_visit_locations' not in fam:
                fam['never_visit_locations'] = []
        
        return prefs
    
    def _detect_branch_poi(self, itinerary_path: Path) -> str:
        """Detect Akshardham (LOC_006) for demo consistency."""
        if not itinerary_path or not itinerary_path.exists():
            return None
        
        with open(itinerary_path, 'r', encoding='utf-8') as f:
            itinerary = json.load(f)
        
        # Load locations
        with open(self.locations_file, 'r', encoding='utf-8') as f:
            locations_list = json.load(f)
        
        locations_map = {loc['location_id']: loc for loc in locations_list}
        
        # First, check if LOC_006 (Akshardham) is in the itinerary
        for day_data in itinerary.get('days', []):
            families_data = day_data.get('families', {})
            for family_id, family_data in families_data.items():
                for poi in family_data.get('pois', []):
                    poi_id = poi.get('location_id')
                    if poi_id == 'LOC_006':  # Akshardham
                        return 'LOC_006'
        
        # Fallback: return any Branch POI
        for day_data in itinerary.get('days', []):
            families_data = day_data.get('families', {})
            for family_id, family_data in families_data.items():
                for poi in family_data.get('pois', []):
                    poi_id = poi.get('location_id')
                    if poi_id in locations_map:
                        role = locations_map[poi_id].get('role', 'BRANCH')
                        if role != "SKELETON":
                            return poi_id
        
        return None
    
    def _get_poi_name(self, poi_id: str) -> str:
        """Get POI name from location ID."""
        if not poi_id:
            return "Unknown Location"
        
        with open(self.locations_file, 'r', encoding='utf-8') as f:
            locations = json.load(f)
        
        for loc in locations:
            if loc['location_id'] == poi_id:
                return loc['name']
        
        return poi_id


def main():
    """Entry point for the demo."""
    demo = ReoptimizationDemo()
    demo.run()


if __name__ == "__main__":
    main()
