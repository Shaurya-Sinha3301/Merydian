from typing import Dict, Any, List
from app.contracts.optimization import OptimizationResult
import logging

logger = logging.getLogger(__name__)

class ExplainabilityService:
    """
    Service to generate human-readable explanations and diffs for optimization results.
    Keeps the explainability pipeline completely separate from the optimizer.
    """
    
    @staticmethod
    def generate_explanations(
        result: OptimizationResult,
        baseline_solution: Dict[str, Any],
        locations_map: Dict[str, Any],
        user_input: str = ""
    ) -> OptimizationResult:
        if not result.success:
            return result
            
        try:
            logger.info("Running explainability pipeline...")
            
            from ml_or.explainability.diff_engine import ItineraryDiffEngine
            from ml_or.explainability.causal_tagger import CausalTagger
            from ml_or.explainability.delta_engine import DeltaEngine
            from ml_or.explainability.payload_builder import ExplanationPayloadBuilder
            
            new_solution = result.solution
            decision_traces = result.decision_traces
            
            diff_engine = ItineraryDiffEngine()
            if baseline_solution:
                diffs = diff_engine.compare_optimized_solutions(
                    baseline_optimized=baseline_solution,
                    new_optimized=new_solution,
                    days_to_compare=None,
                    decision_traces=decision_traces,
                )
            else:
                diffs = {}
            
            tagger = CausalTagger()
            tagged_diffs = tagger.tag_changes(diffs, decision_traces)
            
            delta_engine = DeltaEngine()
            enriched_diffs = delta_engine.compute_deltas(
                tagged_diffs, decision_traces, locations_map,
                baseline_solution=baseline_solution, new_solution=new_solution,
            )
            
            builder = ExplanationPayloadBuilder()
            payloads = builder.build_payloads(
                enriched_diffs, locations_map,
                user_input=user_input,
            )
            
            # Serialize enriched diffs keys to strings
            serialized_diffs = {}
            for fid, day_map in enriched_diffs.items():
                serialized_diffs[fid] = {str(d): changes for d, changes in day_map.items()}
            
            result.enriched_diffs = serialized_diffs
            result.llm_payloads = payloads
            
            # Simple human explanation extraction
            if payloads:
                explanations = [p.get("natural_language", "") for p in payloads if p.get("natural_language")]
                if explanations:
                    result.human_explanation = " ".join(explanations)
                else:
                    result.human_explanation = "The itinerary has been updated according to your preferences."
            else:
                result.human_explanation = "No major changes were required."
                
            logger.info(f"Explainability complete. Generated {len(payloads)} explanation payloads.")
            
        except Exception as e:
            logger.exception("Explainability pipeline failed")
            result.human_explanation = "The itinerary was successfully updated, but we could not generate a detailed explanation."
            
        return result
