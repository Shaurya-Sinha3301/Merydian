from typing import Dict, List, Any

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
            
            # 3. Rescheduled (implied if in both but order different? skipping for MV)
            
            if changes:
                diffs[family_id][day_idx + 1] = changes # Use 1-based day index for output consistency
