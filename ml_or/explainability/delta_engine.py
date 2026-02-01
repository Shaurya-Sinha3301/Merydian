from typing import Dict, Any, Optional, List

class DeltaEngine:
    """
    Computes quantitative impact of changes (Cost & Satisfaction).
    """
    
    def compute_deltas(
        self, 
        diffs: Dict, 
        decision_traces: Dict, 
        locations_map: Dict[str, Any],
        baseline_solution: Optional[Dict] = None,
        new_solution: Optional[Dict] = None
    ) -> Dict:
        """
        Enrich diffs with cost and satisfaction deltas.
        
        Args:
            diffs: POI changes per family per day
            decision_traces: Optimizer decision logs
            locations_map: Location data (for entrance fees)
            baseline_solution: Original optimized solution (optional, for transport deltas)
            new_solution: New optimized solution (optional, for transport deltas)
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
        
        # Calculate transport cost deltas if both solutions provided
        if baseline_solution and new_solution:
            self._add_transport_deltas(diffs, baseline_solution, new_solution)
                         
        return diffs
    
    def _add_transport_deltas(
        self,
        diffs: Dict,
        baseline_solution: Dict,
        new_solution: Dict
    ):
        """
        Calculate marginal transport cost for each POI change.
        Extracts transport deltas from the complete routing in both solutions.
        """
        # Index solutions by day
        baseline_days = {d['day']: d for d in baseline_solution.get('days', [])}
        new_days = {d['day']: d for d in new_solution.get('days', [])}
        
        for family_id, day_diffs in diffs.items():
            for day_num, changes in day_diffs.items():
                baseline_day = baseline_days.get(day_num, {})
                new_day = new_days.get(day_num, {})
                
                baseline_family = baseline_day.get('families', {}).get(family_id, {})
                new_family = new_day.get('families', {}).get(family_id, {})
                
                for change in changes:
                    poi_id = change['poi']
                    
                    if change['type'] == 'POI_ADDED':
                        transport_cost = self._calc_added_poi_transport(
                            poi_id,
                            new_family.get('pois', []),
                            new_family.get('transport', []),
                            baseline_family.get('transport', [])
                        )
                        change['cost_delta']['transport_cost'] = round(transport_cost, 2)
                        change['cost_delta']['extra_cost'] += transport_cost
                        change['cost_delta']['extra_cost'] = round(change['cost_delta']['extra_cost'], 2)
                        
                    elif change['type'] == 'POI_REMOVED':
                        transport_savings = self._calc_removed_poi_transport(
                            poi_id,
                            baseline_family.get('pois', []),
                            baseline_family.get('transport', []),
                            new_family.get('transport', [])
                        )
                        change['cost_delta']['transport_savings'] = round(transport_savings, 2)
                        change['cost_delta']['saved_cost'] += transport_savings
                        change['cost_delta']['saved_cost'] = round(change['cost_delta']['saved_cost'], 2)
    
    def _calc_added_poi_transport(
        self,
        poi_id: str,
        new_pois: List[Dict],
        new_transport: List[Dict],
        baseline_transport: List[Dict]
    ) -> float:
        """
        Calculate marginal transport cost of adding a POI.
        
        Strategy:
        1. Find POI's position in new route
        2. Find edges involving this POI in new transport
        3. Find what edge existed in baseline between predecessor and successor
        4. Return difference (new routing cost - old direct routing cost)
        """
        # Find POI index in new route
        poi_index = next(
            (i for i, p in enumerate(new_pois) if p['location_id'] == poi_id),
            -1
        )
        if poi_index == -1:
            return 0.0
        
        # Find predecessor and successor in the new route
        pred_poi = new_pois[poi_index - 1]['location_id'] if poi_index > 0 else 'START'
        succ_poi = new_pois[poi_index + 1]['location_id'] if poi_index < len(new_pois) -1 else 'END'
        
        # Map START/END to actual node names in transport graph
        if poi_index == 0:
            # First POI - predecessor is START_DAY_X
            for edge in new_transport:
                if edge['to'] == poi_id:
                    pred_poi = edge['from']
                    break
        
        if poi_index == len(new_pois) - 1:
            # Last POI - successor is END_DAY_X
            for edge in new_transport:
                if edge['from'] == poi_id:
                    succ_poi = edge['to']
                    break
        
        # Find new edges: pred→poi and poi→succ
        new_cost = 0.0
        for edge in new_transport:
            if (edge['from'] == pred_poi and edge['to'] == poi_id) or \
               (edge['from'] == poi_id and edge['to'] == succ_poi):
                new_cost += edge['cost']
        
        # Find old direct edge: pred→succ (if existed in baseline)
        old_cost = 0.0
        for edge in baseline_transport:
            if edge['from'] == pred_poi and edge['to'] == succ_poi:
                old_cost = edge['cost']
                break
        
        return new_cost - old_cost
    
    def _calc_removed_poi_transport(
        self,
        poi_id: str,
        baseline_pois: List[Dict],
        baseline_transport: List[Dict],
        new_transport: List[Dict]
    ) -> float:
        """
        Calculate marginal transport savings from removing a POI.
        Inverse of _calc_added_poi_transport.
        """
        # Find POI index in baseline route
        poi_index = next(
            (i for i, p in enumerate(baseline_pois) if p['location_id'] == poi_id),
            -1
        )
        if poi_index == -1:
            return 0.0
        
        # Find predecessor and successor in the baseline route
        pred_poi = baseline_pois[poi_index - 1]['location_id'] if poi_index > 0 else 'START'
        succ_poi = baseline_pois[poi_index + 1]['location_id'] if poi_index < len(baseline_pois) - 1 else 'END'
        
        # Map START/END to actual node names
        if poi_index == 0:
            for edge in baseline_transport:
                if edge['to'] == poi_id:
                    pred_poi = edge['from']
                    break
        
        if poi_index == len(baseline_pois) - 1:
            for edge in baseline_transport:
                if edge['from'] == poi_id:
                    succ_poi = edge['to']
                    break
        
        # Find old edges: pred→poi and poi→succ in baseline
        old_cost = 0.0
        for edge in baseline_transport:
            if (edge['from'] == pred_poi and edge['to'] == poi_id) or \
               (edge['from'] == poi_id and edge['to'] == succ_poi):
                old_cost += edge['cost']
        
        # Find new direct edge: pred→succ (if exists in new solution)
        new_cost = 0.0
        for edge in new_transport:
            if edge['from'] == pred_poi and edge['to'] == succ_poi:
                new_cost = edge['cost']
                break
        
        return old_cost - new_cost
