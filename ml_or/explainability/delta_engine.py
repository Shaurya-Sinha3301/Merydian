from typing import Dict, Any

class DeltaEngine:
    """
    Computes quantitative impact of changes (Cost & Satisfaction).
    """
    
    def compute_deltas(self, diffs: Dict, decision_traces: Dict, locations_map: Dict[str, Any]) -> Dict:
        """
        Enrich diffs with cost and satisfaction deltas.
        """
        for fid, day_diffs in diffs.items():
            for day_num, changes in day_diffs.items():
                day_idx = day_num - 1
                trace = decision_traces.get(day_idx)
                
                for change in changes:
                    poi_id = change["poi"]
                    
                    # 1. Satisfaction Delta
                    # Look up score in trace candidates
                    score = 0.0
                    if trace:
                        for fam_cand in trace.get("candidates", []):
                            if fam_cand["family"] == fid:
                                for c in fam_cand["candidates"]:
                                    if c["poi_id"] == poi_id:
                                        score = c.get("interest_score", 0)
                                        break
                    
                    if change["type"] == "POI_ADDED":
                        change["satisfaction_delta"] = {"gain": round(score, 2)}
                    elif change["type"] == "POI_REMOVED":
                        change["satisfaction_delta"] = {"loss": round(score, 2)}
                    
                    # 2. Cost Delta
                    # For now, simplistic: Visit Cost only. Transport requires routing graph.
                    # We can refine this later if transport model is exposed.
                    loc = locations_map.get(poi_id)
                    cost = 0.0
                    if loc:
                         # Handle Location dataclass or dict
                         if hasattr(loc, "cost"):
                             cost = loc.cost
                         elif isinstance(loc, dict):
                             cost = loc.get("cost", 0)
                    
                    if change["type"] == "POI_ADDED":
                        change["cost_delta"] = {"extra_cost": cost, "currency": "INR"}
                    elif change["type"] == "POI_REMOVED":
                         change["cost_delta"] = {"saved_cost": cost, "currency": "INR"}
                         
        return diffs
