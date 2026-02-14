from typing import Dict, List, Any, Optional

class ItineraryDiffEngine:
    """
    Computes factual differences between base and optimized itineraries.
    Deterministic, no AI.
    """
    
    def compute_diff(self, base_itinerary: Dict, optimized_itinerary: Dict) -> Dict[str, Dict[int, List[Dict]]]:
        """
        Compute diffs per family per day.
        
        Returns nested dict: result[family_id][day_idx] = [change_events]
        """
        diffs = {}
        
        # Determine scope (single day or trip)
        # Optimized might be a single day result or a full trip
        # We assume optimized_itinerary matches the output of optimizer.optimize_trip
        # OR optimizer.optimize_multi_family_single_day structure.
        
        # Case A: optimized is a single day solution (direct from optimize_single_family_multi_day)
        if "day" in optimized_itinerary and "families" in optimized_itinerary:
             day_idx = optimized_itinerary["day"] - 1 # 0-indexed internally
             self._process_day_diff(diffs, day_idx, base_itinerary, optimized_itinerary)
             
        # Case B: optimized is a full trip (list of days)
        elif "days" in optimized_itinerary:
            for day_res in optimized_itinerary["days"]:
                day_idx = day_res["day"] - 1
                self._process_day_diff(diffs, day_idx, base_itinerary, day_res)
                
        return diffs

    def compare_optimized_solutions(
        self, 
        baseline_optimized: Dict, 
        new_optimized: Dict, 
        days_to_compare: Optional[List[int]] = None
    ) -> Dict[str, Dict[int, List[Dict]]]:
        """
        Compare two optimized itineraries (rather than base vs optimized).
        Used for mid-trip scenarios where preferences change and we need to
        show the cost/satisfaction impact of the changes.
        
        Args:
            baseline_optimized: The original optimized solution (before changes)
            new_optimized: The new optimized solution (after preference changes)
            days_to_compare: Optional list of day numbers to compare (1-indexed).
                           If None, compares all days.
        
        Returns:
            Nested dict: result[family_id][day_idx] = [change_events]
        """
        diffs = {}
        
        # Both solutions should have "days" structure
        if "days" not in baseline_optimized or "days" not in new_optimized:
            return diffs
        
        baseline_days = {day["day"]: day for day in baseline_optimized["days"]}
        new_days = {day["day"]: day for day in new_optimized["days"]}
        
        # Determine which days to compare
        if days_to_compare is None:
            # Compare all days that exist in both solutions
            days_to_compare = sorted(set(baseline_days.keys()) & set(new_days.keys()))
        
        for day_num in days_to_compare:
            if day_num not in baseline_days or day_num not in new_days:
                continue  # Skip if day doesn't exist in both solutions
            
            day_idx = day_num - 1  # Convert to 0-indexed for internal use
            baseline_day = baseline_days[day_num]
            new_day = new_days[day_num]
            
            # Use the existing _process_day_diff logic but compare
            # baseline_optimized POIs vs new_optimized POIs
            self._process_day_diff_optimized(
                diffs, day_idx, baseline_day, new_day
            )
        
        return diffs

    def _process_day_diff_optimized(
        self, 
        diffs: Dict, 
        day_idx: int, 
        baseline_day: Dict, 
        new_day: Dict
    ):
        """
        Process diff for a single day when comparing two optimized solutions.
        Similar to _process_day_diff but compares family POIs from baseline
        optimized to new optimized.
        """
        # Iterate over families in the new solution
        for family_id, new_family_data in new_day["families"].items():
            if family_id not in diffs:
                diffs[family_id] = {}
            
            # Get baseline POIs for this family
            baseline_family_data = baseline_day.get("families", {}).get(family_id, {})
            baseline_pois = set(p["location_id"] for p in baseline_family_data.get("pois", []))
            new_pois = set(p["location_id"] for p in new_family_data["pois"])
            
            changes = []
            
            # 1. Added POIs (in new but not in baseline)
            added = new_pois - baseline_pois
            for pid in added:
                changes.append({
                    "type": "POI_ADDED",
                    "poi": pid
                })
            
            # 2. Removed POIs (in baseline but not in new)
            removed = baseline_pois - new_pois
            for pid in removed:
                changes.append({
                    "type": "POI_REMOVED",
                    "poi": pid
                })
            
            # 3. Transport route changes (NEW)
            # Detect when transport modes change between identical POIs
            self._detect_route_changes(
                baseline_family_data, 
                new_family_data, 
                changes
            )
            
            if changes:
                diffs[family_id][day_idx + 1] = changes  # Use 1-based day index
    
    def _detect_route_changes(
        self, 
        baseline_family: Dict, 
        new_family: Dict, 
        changes: List[Dict]
    ):
        """
        Detect transport mode changes between baseline and new solution.
        Compares transport modes used between consecutive POIs.
        """
        baseline_pois = baseline_family.get("pois", [])
        new_pois = new_family.get("pois", [])
        
        # Create mapping of POI pairs to transport modes for both solutions
        baseline_routes = {}
        for i in range(len(baseline_pois) - 1):
            from_poi = baseline_pois[i]["location_id"]
            to_poi = baseline_pois[i + 1]["location_id"]
            mode = baseline_pois[i].get("transport_to_next", {}).get("mode", "UNKNOWN")
            baseline_routes[(from_poi, to_poi)] = mode
        
        new_routes = {}
        for i in range(len(new_pois) - 1):
            from_poi = new_pois[i]["location_id"]
            to_poi = new_pois[i + 1]["location_id"]
            mode = new_pois[i].get("transport_to_next", {}).get("mode", "UNKNOWN")
            new_routes[(from_poi, to_poi)] = mode
        
        # Find route pairs that exist in both solutions but with different modes
        for route_pair, baseline_mode in baseline_routes.items():
            if route_pair in new_routes:
                new_mode = new_routes[route_pair]
                if baseline_mode != new_mode:
                    changes.append({
                        "type": "ROUTE_CHANGED",
                        "from_poi": route_pair[0],
                        "to_poi": route_pair[1],
                        "from_mode": baseline_mode,
                        "to_mode": new_mode
                    })



    def _process_day_diff(self, diffs: Dict, day_idx: int, base_itinerary: Dict, day_result: Dict):
        # Get base POIs for this day
        # Base itinerary structure: { "days": [ { "pois": [ { "location_id": "LOC_X" } ] } ] }
        if day_idx >= len(base_itinerary["days"]):
            return # Should not happen if aligned
            
        base_day_data = base_itinerary["days"][day_idx]
        base_pois = set(p["location_id"] for p in base_day_data["pois"])
        
        # Iterate over families in the result
        for family_id, family_data in day_result["families"].items():
            if family_id not in diffs:
                diffs[family_id] = {}
            
            optimized_pois = set(p["location_id"] for p in family_data["pois"])
            
            changes = []
            
            # 1. Added POIs
            added = optimized_pois - base_pois
            for pid in added:
                changes.append({
                    "type": "POI_ADDED",
                    "poi": pid
                })
                
            # 2. Removed POIs
            removed = base_pois - optimized_pois
            for pid in removed:
                changes.append({
                    "type": "POI_REMOVED",
                    "poi": pid
                })
            
            # 3. Transport route changes (detect mode changes)
            base_family_data = {"pois": base_day_data.get("pois", [])}
            self._detect_route_changes(base_family_data, family_data, changes)
            
            if changes:
                diffs[family_id][day_idx + 1] = changes # Use 1-based day index for output consistency


