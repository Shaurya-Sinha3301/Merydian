from typing import Dict, List, Any

# Defining causal tags here for context injection
CAUSAL_TAG_DEFINITIONS = {
    "INTEREST_VECTOR_DOMINANCE": "This POI matches the family's interest tags very strongly (interest score > 1.2)",
    "SHARED_ANCHOR_REQUIRED": "This POI serves as a skeletal/anchor point that enables coordination between multiple families traveling together",
    "OPTIMIZER_SELECTED": "This POI was selected by the optimizer with moderate interest (score 0.8-1.2)",
    "OPTIMIZER_TRADEOFF": "This POI was added despite low interest because it optimizes other factors (time, routing, etc.)",
    "TRANSPORT_ROUTING_OPTIMIZATION": "The route/POI selection was optimized due to transport changes",
    "BUS_UNAVAILABLE": "BUS transport is unavailable (strike, closure, etc.)",
    "METRO_UNAVAILABLE": "METRO transport is unavailable",
    "AUTO_UNAVAILABLE": "AUTO transport is unavailable",
    "CAB_FALLBACK_UNAVAILABLE": "CAB transport is unavailable",
    "TRANSPORT_DISRUPTED": "The original transport mode was disrupted",
    "ROUTE_REROUTED": "Successfully found an alternative transport mode",
    "REROUTED_TO_METRO": "Rerouted to METRO",
    "REROUTED_TO_BUS": "Rerouted to BUS",
    "REROUTED_TO_CAB_FALLBACK": "Rerouted to CAB",
    "ROUTE_OPTIMIZED": "Route was optimized for better efficiency (no disruption)",
    "LOW_INTEREST_DROPPED": "This POI was removed because it has low relevance to the family's interests (score < 0.8)",
    "OBJECTIVE_DOMINATED": "This POI was removed due to optimization tradeoffs (cost, time, or other constraints outweighed its value)"
}

class ExplanationPayloadBuilder:
    """
    Constructs audience-specific JSON payloads for the LLM layer.
    Bundles changes by family and creates a separate comprehensive view for travel agents.
    """
    
    def build_payloads(
        self, 
        enriched_diffs: Dict, 
        locations_map: Dict[str, Any], 
        user_input: str = ""
    ) -> Dict[str, Any]:
        """
        Convert enriched diffs into bundled payloads.
        
        Returns:
            Dict containing:
            - 'families': List[Dict] - One payload per affected family
            - 'travel_agent': Dict - Consolidated payload for the agent
        """
        # 1. Build Family Payloads (One per family)
        family_payloads = []
        all_changes_flat = []  # For travel agent view
        
        for fid, day_diffs in enriched_diffs.items():
            family_changes = []
            
            for day_num, changes in day_diffs.items():
                for change in changes:
                    # Enrich POI name
                    poi_id = change["poi"]
                    loc_name = self._get_loc_name(poi_id, locations_map)
                    
                    # Create change object
                    change_obj = {
                        "day": day_num,
                        "change_type": change["type"],
                        "poi": {
                            "id": poi_id,
                            "name": loc_name
                        },
                        "causal_tags": change.get("causal_tags", []),
                        "cost_delta": change.get("cost_delta", {}),
                        "satisfaction_delta": change.get("satisfaction_delta", {})
                    }
                    
                    family_changes.append(change_obj)
                    
                    # Add to flat list for travel agent, including family_id
                    agent_change = change_obj.copy()
                    agent_change["family_id"] = fid
                    all_changes_flat.append(agent_change)
            
            # Only add payload if there are actual changes for this family
            if family_changes:
                family_payloads.append({
                    "audience": "FAMILY",
                    "family_id": fid,
                    "user_input": user_input,
                    "changes": family_changes,
                    "system_definitions": CAUSAL_TAG_DEFINITIONS
                })
        
        # 2. Build Travel Agent Payload (Consolidated)
        # Calculate aggregate metrics
        total_cost_delta = 0
        total_sat_delta = 0
        
        for c in all_changes_flat:
            # Cost
            if "cost_delta" in c:
                cd = c["cost_delta"]
                total_cost_delta += cd.get("extra_cost", 0)
                total_cost_delta -= cd.get("saved_cost", 0)
            
            # Satisfaction
            if "satisfaction_delta" in c:
                sd = c["satisfaction_delta"]
                total_sat_delta += sd.get("gain", 0)
                total_sat_delta -= sd.get("loss", 0)
        
        travel_agent_payload = {
            "audience": "TRAVEL_AGENT",
            "user_input": user_input,
            "all_changes": all_changes_flat,
            "financial_summary": {
                "total_cost_delta": round(total_cost_delta, 2),
                "total_satisfaction_delta": round(total_sat_delta, 2),
                "affected_families": list(set(p["family_id"] for p in family_payloads)) # Unique list
            },
            "system_definitions": CAUSAL_TAG_DEFINITIONS
        }
        
        return {
            "families": family_payloads,
            "travel_agent": travel_agent_payload
        }

    def _get_loc_name(self, poi_id: str, locations_map: Dict) -> str:
        """Helper to safely extract location name."""
        loc = locations_map.get(poi_id)
        if loc:
            if hasattr(loc, "name"):
                return loc.name
            elif isinstance(loc, dict):
                return loc.get("name", "Unknown")
        return "Unknown"
