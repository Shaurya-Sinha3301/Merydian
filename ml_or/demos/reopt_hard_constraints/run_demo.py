"""
Re-Optimization Demo with Agentic Workflow Integration
"""

import sys
import json
import requests
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from ml_or.demos.reopt_hard_constraints.trip_session_manager import TripSessionManager
from ml_or.demos.reopt_hard_constraints.feedback_processor import FeedbackProcessor

# ANSI Colors for beautiful terminal output
RESET = "\033[0m"
BOLD = "\033[1m"
BLUE = "\033[94m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RED = "\033[91m"
MAGENTA = "\033[95m"

class DemoLogger:
    """Handles logging to both terminal (beautiful) and markdown files (timestamped + latest)."""
    
    def __init__(self, log_file_path: Path):
        self.log_files = [
            log_file_path,
            log_file_path.parent / "latest_demo_log.md"
        ]
        
        # Initialize MD files
        header = f"# Re-Optimization Demo Log\n\n**Run Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n---\n\n"
        for path in self.log_files:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(header)

    def section(self, title: str):
        # Terminal
        print("\n" + "="*80)
        print(f"  {BOLD}{title.upper()}{RESET}")
        print("="*80)
        # Files
        for path in self.log_files:
            with open(path, 'a', encoding='utf-8') as f:
                f.write(f"\n## {title}\n\n")

    def info(self, message: str, color=RESET):
        print(f"{color}{message}{RESET}")
        for path in self.log_files:
            with open(path, 'a', encoding='utf-8') as f:
                f.write(f"{message}\n\n")

    def key_value(self, key: str, value: Any, color=BLUE):
        print(f"{color}{key:<20}{RESET} {value}")
        for path in self.log_files:
            with open(path, 'a', encoding='utf-8') as f:
                f.write(f"- **{key}:** {value}\n")

    def code_block(self, content: str, language: str = "json"):
        # Terminal (plain indentation)
        print(content.replace('\n', '\n    '))
        # Files
        for path in self.log_files:
            with open(path, 'a', encoding='utf-8') as f:
                f.write(f"```{language}\n{content}\n```\n\n")

    def success(self, message: str):
        print(f"{GREEN}✓ {message}{RESET}")
        for path in self.log_files:
            with open(path, 'a', encoding='utf-8') as f:
                f.write(f"> ✅ {message}\n\n")

    def error(self, message: str):
        print(f"{RED}❌ {message}{RESET}")
        for path in self.log_files:
            with open(path, 'a', encoding='utf-8') as f:
                f.write(f"> ❌ **ERROR:** {message}\n\n")


class ReoptimizationDemo:
    
    def __init__(self):
        self.demo_dir = Path(__file__).parent
        self.data_dir = self.demo_dir / "data"
        self.output_dir = self.demo_dir / "output"
        self.output_dir.mkdir(exist_ok=True)
        
        self.session_manager = TripSessionManager(
            storage_dir=self.output_dir / "sessions"
        )
        
        self.processor = FeedbackProcessor()
        
        self.demo_trip_id = f"demo_trip_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        self.locations_file = project_root / "ml_or" / "data" / "locations.json"
        self.base_itinerary_file = str(project_root / "ml_or" / "data" / "base_itinerary_final.json")
        
        self.api_url = "http://localhost:8000/api/v1/demo/receive_optimization"
        
        # Initialize logger
        log_path = self.output_dir / f"demo_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        self.logger = DemoLogger(log_path)
    
    def run(self):
        self.logger.section("Re-Optimization Demo - Agentic Workflow")
        self.logger.info("This demo simulates a chat interface where families provide feedback")
        self.logger.info("and the system responds with optimized itineraries and explanations.\n")
        
        # Phase 0: Initialize session
        self.logger.section("Phase 0: Initialize Trip Session")
        
        baseline_prefs = self._load_baseline_preferences()
        session = self.session_manager.create_session(
            trip_id=self.demo_trip_id,
            family_ids=["FAM_A", "FAM_B", "FAM_C"],
            baseline_prefs=baseline_prefs,
            baseline_itinerary_path=self.base_itinerary_file
        )
        
        self.logger.key_value("Trip ID", self.demo_trip_id)
        self.logger.key_value("Families", ', '.join(session.family_ids))
        self.logger.key_value("Baseline Itinerary", session.baseline_itinerary_path)
        self.logger.key_value("Session Storage", self.session_manager.storage_dir)
        
        # Phase 1: Generate baseline itinerary
        self.logger.section("Phase 1: Generate Baseline Itinerary")
        
        baseline_result = self._generate_baseline()
        if baseline_result:
            self.logger.success("Baseline itinerary generated successfully!")
            self.logger.key_value("Saved to", baseline_result)
            
            # Update session with baseline
            session.update_itinerary(Path(baseline_result))
            self.session_manager._save_session(session)
        
        # Phase 2: Process feedback - Must Visit
        self.logger.section("Phase 2: Chat Message - Must Visit Request")
        
        self._simulate_chat_message(
            family_id="FAM_A",
            message="We loved Chandni Chowk, we definitely want to visit it tomorrow.",
            phase_name="must_visit"
        )
        
        # Phase 3: Simulated "Never Visit" request
        import time
        self.logger.info("Waiting 10 seconds before next request to avoid rate limits...")
        time.sleep(10)
        
        self.logger.section("Phase 3: Chat Message - Never Visit Request")
        self._simulate_chat_message(
            family_id="FAM_B",
            message="We're not interested in Lodhi Gardens, please skip it.",
            phase_name="never_visit"
        )
        
        # Summary
        self.logger.section("Demo Complete")
        
        final_session = self.session_manager.get_session(self.demo_trip_id)
        self.logger.key_value("Total Iterations", final_session.iteration_count)
        self.logger.key_value("Feedback Messages", len(final_session.feedback_history))
        self.logger.key_value("Output Directory", self.output_dir / self.demo_trip_id)
        
        print("\n" + "="*80 + "\n")
    
    def _simulate_chat_message(self, family_id: str, message: str, phase_name: str):
        print("") # Spacing
        self.logger.key_value("[CHAT MESSAGE]", family_id, color=MAGENTA)
        self.logger.key_value("Message", f'"{message}"', color=RESET)
        print("")
        self.logger.info(f"{YELLOW}[PROCESSING] Using AgentController pipeline...{RESET}")
        
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
            print("")
            self.logger.key_value("[RESULT] Event Type", result['event_type'], color=CYAN)
            self.logger.key_value("[RESULT] Action", result['action_taken'], color=CYAN)
            self.logger.key_value("[RESULT] Itinerary Updated", str(result['itinerary_updated']), color=CYAN)
            self.logger.key_value("[RESULT] Iteration", str(result['iteration']), color=CYAN)
            
            if result.get('explanations'):
                self.logger.info(f"\n{BOLD}[EXPLANATIONS]{RESET}")
                for exp in result['explanations']:
                    self.logger.info(f"  - {exp}")
            
            if result.get('itinerary_updated') and result.get('output_dir'):
                self._post_to_api(result)
            
            self.logger.key_value("[OUTPUT]", str(result['output_dir']), color=BLUE)
            
        except Exception as e:
            self.logger.error(str(e))
            import traceback
            traceback.print_exc()
            
    def _post_to_api(self, result: Dict[str, Any]):
        print("")
        self.logger.info(f"{MAGENTA}[API POST] Sending updated itinerary to {self.api_url}...{RESET}")
        
        try:
            output_dir = Path(result['output_dir'])
            itinerary_path = output_dir / "optimized_solution.json"
            llm_payloads_path = output_dir / "llm_payloads.json"
            
            if not itinerary_path.exists():
                self.logger.error("Itinerary file not found")
                return

            with open(itinerary_path, 'r', encoding='utf-8') as f:
                itinerary_data = json.load(f)
                
            llm_payloads = []
            if llm_payloads_path.exists():
                with open(llm_payloads_path, 'r', encoding='utf-8') as f:
                    llm_payloads = json.load(f)
                
                # Log LLM payloads nicely
                self.logger.info(f"\n{BOLD}[LLM PAYLOADS]{RESET}")
                for i, payload in enumerate(llm_payloads, 1):
                    formatted = {
                        "Family": payload.get('family'),
                        "POI": payload.get('poi', {}).get('name', 'Unknown'),
                        "Action": payload.get('change_type'),
                        "Reasoning": payload.get('causal_tags', [])
                    }
                    self.logger.code_block(json.dumps(formatted, indent=2))
            
            payload = {
                "trip_id": self.demo_trip_id,
                "iteration": result.get('iteration', 0),
                "itinerary": itinerary_data,
                "llm_payloads": llm_payloads,
                "explanations": result.get('explanations', [])
            }
            
            response = requests.post(self.api_url, json=payload)
            
            if response.status_code == 200:
                self.logger.success("Data received by endpoint")
                self.logger.key_value("[API RESPONSE]", response.json().get('message'))
            else:
                self.logger.error(f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.logger.error(f"Failed to post data: {e}")

    def _generate_baseline(self) -> str:
        from ml_or.itinerary_optimizer import ItineraryOptimizer
        
        baseline_dir = self.output_dir / self.demo_trip_id / "iteration_0_baseline"
        baseline_dir.mkdir(parents=True, exist_ok=True)
        
        prefs_path = baseline_dir / "preferences.json"
        session = self.session_manager.get_session(self.demo_trip_id)
        with open(prefs_path, 'w', encoding='utf-8') as f:
            json.dump(session.current_preferences, f, indent=2)
        
        try:
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
            
            solution_path = baseline_dir / "itinerary.json"
            with open(solution_path, 'w', encoding='utf-8') as f:
                json.dump(solution, f, indent=2)
            
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
        baseline_path = self.data_dir / "family_preferences_baseline.json"
        
        with open(baseline_path, 'r', encoding='utf-8') as f:
            prefs = json.load(f)
        
        for fam in prefs:
            if 'must_visit_locations' not in fam:
                fam['must_visit_locations'] = []
            if 'never_visit_locations' not in fam:
                fam['never_visit_locations'] = []
        
        return prefs


def main():
    demo = ReoptimizationDemo()
    demo.run()


if __name__ == "__main__":
    main()
