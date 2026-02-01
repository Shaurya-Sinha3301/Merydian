from typing import Dict, List, Any

class ExplanationPayloadBuilder:
    """
    Constructs strict JSON payloads for the LLM layer.
    """
    
    def build_payloads(self, enriched_diffs: Dict, locations_map: Dict[str, Any], audience: str = "TRAVEL_AGENT") -> List[Dict]:
        """
        Convert enriched diffs into flat list of payloads for rendering.
        """
        payloads = []
        
        for fid, day_diffs in enriched_diffs.items():
            for day_num, changes in day_diffs.items():
                for change in changes:
                    poi_id = change["poi"]
                    loc = locations_map.get(poi_id)
                    if loc:
                        if hasattr(loc, "name"):
                            loc_name = loc.name
                        elif isinstance(loc, dict):
                            loc_name = loc.get("name", "Unknown")
                        else:
                            loc_name = "Unknown"
                    else:
                        loc_name = "Unknown"
                    
                    if not change.get("causal_tags"):
                         # WARNING: Skip LLM if no causal tags (Safety)
                         # Or we could flag it. Rules say "If causal_tags is empty DO NOT CALL LLM"
                         # We'll include it but mark it as invalid/unsafe if needed?
                         # Or just skip. Let's skip as per strict rule.
                         continue
                    
                    payload = {
                        "family": fid,
                        "day": day_num,
                        "change_type": change["type"],
                        "poi": {
                            "id": poi_id,
                            "name": loc_name
                        },
                        "causal_tags": change.get("causal_tags", []),
                        "cost_delta": change.get("cost_delta", {}),
                        "satisfaction_delta": change.get("satisfaction_delta", {}),
                        "audience": audience
                    }
                    payloads.append(payload)
                    
        return payloads
