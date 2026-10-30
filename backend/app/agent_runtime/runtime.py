import logging
import time
from typing import Dict, Any, Callable
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError

from app.agent_runtime.schemas import (
    BaseAgentRequest,
    ToolsAgentRequest,
    CommunicationAgentRequest,
    FeedbackOptimizationRequest,
    AgentRuntimeResult
)
from app.agent_runtime.exceptions import (
    AgentRuntimeError, 
    AgentProviderError, 
    AgentTimeoutError,
    AgentValidationError
)

logger = logging.getLogger(__name__)

class AgentRuntime:
    """
    Production boundary for Agent Execution.
    No other API or Service layer should import from `agents/` directly.
    """
    
    def __init__(self, default_timeout_seconds: int = 120):
        self.default_timeout_seconds = default_timeout_seconds

    def _execute_with_timeout_and_normalization(
        self, func: Callable, request: BaseAgentRequest, timeout_seconds: int, **kwargs
    ) -> AgentRuntimeResult:
        start_time = time.time()
        result_payload = {}
        success = False
        error_msg = None
        
        try:
            # ThreadPoolExecutor timeout protects request flow,
            # but does not terminate stuck threads.
            # Real cancellation will happen in Celery workers
            # using worker time limits.
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(func, request, **kwargs)
                result_payload = future.result(timeout=timeout_seconds)
            success = True
            
        except FuturesTimeoutError:
            error_msg = str(AgentTimeoutError(f"Agent execution timed out after {timeout_seconds} seconds"))
            logger.error(f"Timeout for job {request.job_id}")
        except Exception as e:
            # Normalize errors
            error_str = str(e).lower()
            if isinstance(e, AgentValidationError):
                error_msg = str(e)
            elif "rate limit" in error_str or "503" in error_str or "groq" in error_str or "gemini" in error_str:
                error_msg = str(AgentProviderError(f"Upstream provider failed: {e}"))
            elif "timeout" in error_str:
                error_msg = str(AgentTimeoutError(f"Execution timed out: {e}"))
            else:
                error_msg = str(AgentRuntimeError(f"Agent execution failed: {e}"))
                
            logger.error(f"AgentRuntime execution error for job {request.job_id}: {error_msg}")
            
        finally:
            execution_time = time.time() - start_time
            return AgentRuntimeResult(
                success=success,
                result=result_payload if isinstance(result_payload, dict) else {},
                error=error_msg,
                metadata={"execution_time_seconds": execution_time, "timeout_seconds": timeout_seconds}
            )

    def execute_feedback_optimization(
        self, request: FeedbackOptimizationRequest, timeout_seconds: int = None
    ) -> AgentRuntimeResult:
        """
        Executes the full feedback → policy → optimization pipeline
        using architecture contracts. No file paths cross this boundary.
        """
        def _run(req: FeedbackOptimizationRequest):
            if not req.family_id or not req.message:
                raise AgentValidationError("Missing 'family_id' or 'message' in request")

            # ─── Step 1: Parse feedback using FeedbackAgent ───
            from agents.feedback_agent import FeedbackAgent
            feedback_agent = FeedbackAgent()
            understanding = feedback_agent.parse(req.message)

            # ─── Step 2: Build TravelConstraints using DecisionPolicyAgent ───
            from agents.decision_policy_agent import DecisionPolicyAgent
            policy_agent = DecisionPolicyAgent()
            decision = policy_agent.decide(understanding, req.context) if req.context else policy_agent.decide(understanding, None)

            # ─── Step 3: Convert PolicyDecision.travel_constraint → TravelConstraints contract ───
            from app.contracts.optimization import (
                TravelConstraints, OptimizationRequest, FamilyPreferenceData,
                PaceLevel, BudgetLevel, HotelQuality,
            )
            
            tc = decision.travel_constraint
            constraints = TravelConstraints()
            
            if tc:
                constraints.must_visit = tc.hard_constraints.get("must_visit", [])
                constraints.never_visit = tc.hard_constraints.get("never_visit", [])
                
                # Map soft constraints to typed enums
                pace_str = tc.soft_constraints.get("pace")
                if pace_str:
                    pace_map = {
                        "very_relaxed": PaceLevel.VERY_RELAXED, "relaxed": PaceLevel.RELAXED,
                        "moderate": PaceLevel.MODERATE, "active": PaceLevel.ACTIVE,
                        "intensive": PaceLevel.INTENSIVE, "slower": PaceLevel.RELAXED,
                        "faster": PaceLevel.ACTIVE,
                    }
                    constraints.pace = pace_map.get(pace_str, PaceLevel.MODERATE)
                
                budget_str = tc.soft_constraints.get("budget_level")
                if budget_str:
                    budget_map = {
                        "budget": BudgetLevel.BUDGET, "moderate": BudgetLevel.MODERATE,
                        "premium": BudgetLevel.PREMIUM, "luxury": BudgetLevel.LUXURY,
                    }
                    constraints.budget_level = budget_map.get(budget_str, BudgetLevel.MODERATE)
                
                hotel_str = tc.soft_constraints.get("hotel_quality")
                if hotel_str:
                    hotel_map = {
                        "budget": HotelQuality.BUDGET, "standard": HotelQuality.STANDARD,
                        "balanced": HotelQuality.STANDARD, "premium": HotelQuality.PREMIUM,
                        "luxury": HotelQuality.LUXURY,
                    }
                    constraints.hotel_quality = hotel_map.get(hotel_str, HotelQuality.STANDARD)

            # ─── Step 4: Load TravelDataset via TravelDataProvider ───
            from app.services.travel_data_provider import TravelDataProvider
            provider = TravelDataProvider()
            
            # Build preference overrides from the Preference table (DB SSOT)
            preference_overrides = None
            try:
                from app.services.preference_service import PreferenceService
                from app.services.family_service import FamilyService
                
                # Get family UUIDs for this trip's families
                families_prefs = {}
                if req.context and req.context.families:
                    for fam_data in req.context.families:
                        fam_code = fam_data.get("family_code", "")
                        fam = FamilyService.get_family_by_code(fam_code)
                        if fam:
                            db_prefs = PreferenceService.get_preferences_as_dict(fam.id)
                            families_prefs[fam_code] = FamilyPreferenceData(
                                family_id=fam_code,
                                must_visit_locations=db_prefs.get("must_visit", []),
                                never_visit_locations=db_prefs.get("never_visit", []),
                                members=fam_data.get("members", 1),
                                budget_sensitivity=0.5,
                            )
                if families_prefs:
                    preference_overrides = families_prefs
            except Exception as e:
                logger.warning(f"Could not load DB preferences, falling back to file: {e}")
            
            dataset = provider.build_dataset(preference_overrides=preference_overrides)
            
            # ─── Step 5: Load current solution from DB if available ───
            current_solution = None
            if req.context and req.context.current_itinerary:
                current_solution = req.context.current_itinerary
            
            # ─── Step 6: Build OptimizationRequest ───
            family_ids = [f.get("family_code", "") for f in (req.context.families if req.context else [])]
            if not family_ids:
                family_ids = list(dataset.family_preferences.keys())
            
            opt_request = OptimizationRequest(
                trip_id=req.trip_id,
                family_ids=family_ids,
                num_days=len(dataset.base_itinerary.days),
                dataset=dataset,
                constraints=constraints,
                current_solution=current_solution,
                user_input=req.message,
            )
            
            # ─── Step 7: Execute via OptimizerAgent ───
            from agents.optimizer_agent import OptimizerAgent
            optimizer_agent = OptimizerAgent()
            result = optimizer_agent.run_with_contracts(opt_request)
            
            # ─── Step 8: Explainability ───
            if result.success:
                from app.services.explainability_service import ExplainabilityService
                result = ExplainabilityService.generate_explanations(
                    result=result,
                    baseline_solution=current_solution,
                    locations_map=optimizer_agent.locations_map,
                    user_input=req.message
                )
            
            return {
                "understanding": understanding.model_dump(),
                "decision": decision.model_dump(),
                "optimization_result": {
                    "success": result.success,
                    "solution": result.solution,
                    "enriched_diffs": result.enriched_diffs,
                    "llm_payloads": result.llm_payloads,
                    "error": result.error,
                    "human_explanation": result.human_explanation,
                    "solver_status": result.solver_status,
                    "metrics": result.metrics,
                    "warnings": result.warnings,
                    "validation_report": result.validation_report
                },
            }
            
        return self._execute_with_timeout_and_normalization(
            _run, request, timeout_seconds or self.default_timeout_seconds
        )

    def execute_tools_agent(
        self, request: ToolsAgentRequest, timeout_seconds: int = None
    ) -> AgentRuntimeResult:
        """
        Executes the Tools Agent tasks.
        """
        def _run(req: ToolsAgentRequest):
            from app.services.agent_service import AgentService
            success = AgentService.trigger_tools_agent(
                option_id=req.option_id,
                event_id=req.event_id,
                trip_id=req.trip_id,
                details=req.details
            )
            return {"tools_triggered": success}
            
        return self._execute_with_timeout_and_normalization(
            _run, request, timeout_seconds or self.default_timeout_seconds
        )

    def execute_communication_agent(
        self, request: CommunicationAgentRequest, timeout_seconds: int = None
    ) -> AgentRuntimeResult:
        """
        Executes the Communication Agent tasks.
        """
        def _run(req: CommunicationAgentRequest):
            from app.services.agent_service import AgentService
            success = AgentService.trigger_communication_agent(
                option_id=req.option_id,
                event_id=req.event_id,
                trip_id=req.trip_id,
                agent_id=req.user_id
            )
            return {"communication_triggered": success}
            
        return self._execute_with_timeout_and_normalization(
            _run, request, timeout_seconds or self.default_timeout_seconds
        )
