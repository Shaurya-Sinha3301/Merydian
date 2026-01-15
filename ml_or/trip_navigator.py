
import sys
import json
import logging
from typing import Dict, List, Optional
sys.path.append('ml_or')
from itinerary_optimizer import ItineraryOptimizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TripNavigator")

class TripNavigator:
    """
    Phase 7: Real-Time Navigator
    Acts as a stateful wrapper around the stateless CP-SAT solver.
    Allows re-optimization of the current day based on 'Live Snapshots'.
    """
    def __init__(self, base_itinerary_path, family_prefs_path):
        # FIX: Explicitly name arguments to match ItineraryOptimizer.__init__ signature
        self.opt = ItineraryOptimizer(
            base_itinerary_file=base_itinerary_path, 
            family_prefs_file=family_prefs_path,
            locations_file='ml_or/data/locations.json',
            transport_file='ml_or/data/transport_graph.json'
        )
        self.visited_history = {} # {fid: set(visited_ids)}
        
    def set_visited_history(self, history: Dict[str, List[str]]):
        """Pre-load history (e.g. from Days 1-2 if optimizing Day 3)"""
        for fid, pois in history.items():
            self.visited_history[fid] = set(pois)
            
    def re_optimize_day(
        self,
        day_index: int, # 0-indexed
        family_ids: List[str],
        current_state: Dict[str, Dict], # {fid: {'loc': 'LOC_ID', 'time': 'HH:MM'}}
        user_requests: Dict[str, Dict] = None # {fid: {'force_visit': [], 'force_skip': []}}
    ):
        """
        Trigger a Snapshot Re-Solve.
        """
        logger.info(f"--- RE-OPTIMIZING DAY {day_index + 1} ---")
        logger.info(f"Current State: {current_state}")
        if user_requests:
            logger.info(f"User Requests: {user_requests}")
            
        # 1. Convert timestamp strings to minutes for the optimizer
        override_state_parsed = {}
        for fid, state in current_state.items():
            time_str = state['time']
            time_min = self.opt._time_to_minutes(time_str)
            override_state_parsed[fid] = {
                'loc': state['loc'],
                'time': time_min
            }
            
        # 2. Run Optimizer with Step 7 Injection
        # We only pass visited_history to ensure Repeatability logic holds.
        # But wait - if we are mid-day, the 'visited_history' should ideally 
        # include things visited *this morning*.
        # The caller is responsible for passing a COMPLETE visited_history up to this moment.
        
        new_day_plan = self.opt.optimize_multi_family_single_day(
            day_index=day_index,
            family_ids=family_ids,
            visited_history=self.visited_history,
            override_start_state=override_state_parsed,
            forced_constraints=user_requests,
            max_pois=4, # Keep it tight for remainder of day
            time_limit_seconds=10 # Fast response
        )
        
        if new_day_plan:
            logger.info("✅ Re-Optimization Successful!")
            return new_day_plan
        else:
            logger.error("❌ Re-Optimization Failed (Infeasible or Error).")
            return None

if __name__ == "__main__":
    # Simple Unit Test
    nav = TripNavigator(
        'ml_or/data/base_itinerary_final.json',
        'ml_or/data/family_preferences_3fam_strict.json'
    )
    
    # Simulate Day 1, 13:00 PM at Lunch
    # Request: Force Visit Lotus Temple (LOC_004)
    # Context: Day 1 normally visits Raj Ghat -> Lunch -> India Gate...
    
    test_state = {
        'FAM_A': {'loc': 'LOC_LUNCH', 'time': '13:00'},
        'FAM_B': {'loc': 'LOC_LUNCH', 'time': '13:00'},
        'FAM_C': {'loc': 'LOC_LUNCH', 'time': '13:00'}
    }
    
    # Pre-load history: Assuming they already visited Raj Ghat (LOC_008)
    nav.set_visited_history({
        'FAM_A': ['LOC_008'], 
        'FAM_B': ['LOC_008'], 
        'FAM_C': ['LOC_008']
    })
    
    # Request
    reqs = {
        'FAM_A': {'force_visit': ['LOC_004']}, # Lotus Temple
        'FAM_B': {'force_visit': ['LOC_004']},
        'FAM_C': {'force_visit': ['LOC_004']}
    }
    
    result = nav.re_optimize_day(0, ['FAM_A', 'FAM_B', 'FAM_C'], test_state, reqs)
    
    if result:
        print(json.dumps(result, indent=2))
