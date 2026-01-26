import unittest
from ml_or.explainability.diff_engine import ItineraryDiffEngine
from ml_or.explainability.causal_tagger import CausalTagger
from ml_or.explainability.delta_engine import DeltaEngine
from ml_or.explainability.payload_builder import ExplanationPayloadBuilder

class TestExplainabilityPipeline(unittest.TestCase):
    def test_pipeline_flow(self):
        # 1. SETUP MOCK DATA
        
        # Base: Family A visits POI_1
        base_itinerary = {
            "days": [
                {
                    "day_index": 1,
                    "pois": [{"location_id": "POI_1"}]
                }
            ]
        }
        
        # Optimized: Family A visits POI_1 AND POI_2 (Added POI_2)
        optimized_itinerary = {
            "day": 1,
            "families": {
                "FAM_A": {
                    "pois": [
                        {"location_id": "POI_1"},
                        {"location_id": "POI_2"}
                    ]
                }
            }
        }
        
        # Trace: POI_2 was a candidate with high interest
        decision_traces = {
            0: { # Day index 0
                "candidates": [
                    {
                        "family": "FAM_A",
                        "candidates": [
                            {"poi_id": "POI_2", "interest_score": 1.5, "role": "BRANCH"}
                        ]
                    }
                ],
                "constraints": [],
                "outcome": {}
            }
        }
        
        # Locations Map
        locations_map = {
            "POI_1": {"name": "Old Place", "cost": 100},
            "POI_2": {"name": "New Place", "cost": 500}
        }
        
        # 2. RUN DIFF ENGINE
        diff_engine = ItineraryDiffEngine()
        diffs = diff_engine.compute_diff(base_itinerary, optimized_itinerary)
        
        # Verify Diff
        self.assertIn("FAM_A", diffs)
        self.assertEqual(len(diffs["FAM_A"][1]), 1)
        self.assertEqual(diffs["FAM_A"][1][0]["type"], "POI_ADDED")
        self.assertEqual(diffs["FAM_A"][1][0]["poi"], "POI_2")
        
        # 3. RUN CAUSAL TAGGER
        tagger = CausalTagger()
        tagged_diffs = tagger.tag_changes(diffs, decision_traces)
        
        # Verify Tags (Interest > 1.2 -> INTEREST_VECTOR_DOMINANCE)
        change = tagged_diffs["FAM_A"][1][0]
        self.assertIn("INTEREST_VECTOR_DOMINANCE", change["causal_tags"])
        
        # 4. RUN DELTA ENGINE
        delta_engine = DeltaEngine()
        enriched_diffs = delta_engine.compute_deltas(tagged_diffs, decision_traces, locations_map)
        
        # Verify Deltas
        change = enriched_diffs["FAM_A"][1][0]
        self.assertEqual(change["satisfaction_delta"]["gain"], 1.5)
        self.assertEqual(change["cost_delta"]["extra_cost"], 500)
        
        # 5. RUN PAYLOAD BUILDER
        builder = ExplanationPayloadBuilder()
        payloads = builder.build_payloads(enriched_diffs, locations_map)
        
        # Verify Payload
        self.assertEqual(len(payloads), 1)
        p = payloads[0]
        self.assertEqual(p["family"], "FAM_A")
        self.assertEqual(p["poi"]["name"], "New Place")
        self.assertEqual(p["audience"], "TRAVEL_AGENT") # Default

if __name__ == "__main__":
    unittest.main()
