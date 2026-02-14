from typing import Dict, List, Any

class CausalTagger:
    """
    Assigns causal tags to diffs using decision traces and rules.
    Deterministic inference.
    """
    
    def tag_changes(self, diffs: Dict, decision_traces: Dict) -> Dict:
        """
        Enrich diffs with causal tags.
        Returns: Updated diffs structure with 'causal_tags' field in each change.
        """
        # diffs: { family_id: { day_idx (1-based): [ changes ] } }
        # decision_traces: { day_index (0-based): { candidates, constraints, outcome } }
        
        for fid, day_diffs in diffs.items():
            for day_num, changes in day_diffs.items():
                day_idx = day_num - 1
                trace = decision_traces.get(day_idx)
                
                if not trace:
                    continue
                    
                for change in changes:
                    change["causal_tags"] = self._infer_tags(change, fid, day_idx, trace)
                    
        return diffs

    def _infer_tags(self, change: Dict, fid: str, day_idx: int, trace: Dict) -> List[str]:
        tags = []
        c_type = change["type"]
        poi_id = change.get("poi")  # POI might be None for ROUTE_CHANGED
        
        # 1. CHECK CONSTRAINTS (Hard reasons)
        # Look for explicit constraint logs
        for constraint in trace.get("constraints", []):
            # Check if constraint applies to this POI and Family
            applies = constraint.get("applies_to", {})
            if poi_id and applies.get("poi") == poi_id:
                if applies.get("family") == fid or applies.get("family") == "ALL":
                    tags.append(constraint["type"])
        
        # 2. CHECK CANDIDATE DATA (Soft reasons)
        candidate_info = None
        if poi_id:
            for fam_cand in trace.get("candidates", []):
                if fam_cand["family"] == fid:
                    for c in fam_cand["candidates"]:
                        if c["poi_id"] == poi_id:
                            candidate_info = c
                            break
        
        if c_type == "POI_ADDED":
            # Why did we add this?
            if candidate_info:
                # If interest score is high (> 1.2 base usually implies tag match)
                if candidate_info.get("interest_score", 0) > 1.2:
                    tags.append("INTEREST_VECTOR_DOMINANCE")
                
                # Check if it was a skeletal role
                if candidate_info.get("role") == "SKELETON":
                    tags.append("SHARED_ANCHOR_REQUIRED")

        elif c_type == "POI_REMOVED":
            # Why did we remove this?
            # If explicit constraint found above (e.g. HISTORY_BAN), we are good.
            if not tags:
                 # Inference: If eligible but not picked
                 # Check if interest was low
                 if candidate_info and candidate_info.get("interest_score", 0) < 0.8:
                     tags.append("LOW_INTEREST_DROPPED")
                 else:
                     # General fallback for optimizer tradeoffs
                     tags.append("OBJECTIVE_DOMINATED")
        
        # 3. TRANSPORT DISRUPTION DETECTION (NEW)
        elif c_type == "ROUTE_CHANGED":
            # Check if this route change is due to transport disruption
            from_mode = change.get("from_mode")
            to_mode = change.get("to_mode")
            
            # Check if there are active disruptions in the trace
            if trace.get("active_disruptions"):
                for disruption in trace["active_disruptions"]:
                    # Check if the disruption affects the original transport mode
                    if disruption.get("affected_modes") and from_mode in disruption["affected_modes"]:
                        tags.append("TRANSPORT_DISRUPTED")
                        tags.append(f"DISRUPTION_{disruption.get('reason', 'UNKNOWN')}")
                        
                        # If we successfully rerouted to a different mode
                        if to_mode and to_mode != from_mode:
                            tags.append("ROUTE_REROUTED")
                        
                        break  # One disruption match is enough
            
            # If no disruption found but route changed, might be optimization
            if not tags:
                tags.append("ROUTE_OPTIMIZED")
                
        return list(set(tags))  # Unique tags
