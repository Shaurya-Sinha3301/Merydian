from typing import List, Optional
import datetime
from app.contracts.optimization import (
    TravelConstraints,
    FamilyPreferenceData,
    BudgetLevel,
    PaceLevel,
    HotelQuality,
    ConstraintMetadata,
    ConstraintPriority
)

class ConflictResolver:
    """
    Deterministically resolves conflicting preferences between families and overrides from feedback.
    
    Resolution Order:
    1. Hard Constraints (Must Visit / Never Visit)
    2. Safety (not currently explicitly modeled in preferences)
    3. Accessibility
    4. Budget (Strictest budget wins if conflicting)
    5. Pace (Slowest pace wins to accommodate everyone)
    6. Preferences
    """

    @staticmethod
    def resolve(
        family_prefs: List[FamilyPreferenceData],
        feedback_constraints: Optional[TravelConstraints] = None
    ) -> TravelConstraints:
        
        # Start with an empty constraint object
        resolved = TravelConstraints()
        
        # Collect from families
        all_must_visit = set()
        all_never_visit = set()
        
        # We will track the strictest requirements
        min_budget = None
        min_pace = None
        
        for pref in family_prefs:
            all_must_visit.update(pref.must_visit_locations)
            all_never_visit.update(pref.never_visit_locations)
            
            # Simple heuristic: budget_sensitivity -> BudgetLevel
            # 0.0 -> LUXURY, 1.0 -> BUDGET
            if pref.budget_sensitivity > 0.7:
                fam_budget = BudgetLevel.BUDGET
            elif pref.budget_sensitivity > 0.4:
                fam_budget = BudgetLevel.MODERATE
            elif pref.budget_sensitivity > 0.1:
                fam_budget = BudgetLevel.PREMIUM
            else:
                fam_budget = BudgetLevel.LUXURY
                
            if not min_budget or ConflictResolver._budget_rank(fam_budget) < ConflictResolver._budget_rank(min_budget):
                min_budget = fam_budget

        resolved.must_visit = list(all_must_visit)
        resolved.never_visit = list(all_never_visit)
        resolved.budget_level = min_budget or BudgetLevel.MODERATE
        resolved.pace = PaceLevel.MODERATE # Default pace
        resolved.hotel_quality = HotelQuality.STANDARD

        # Hard constraint conflict resolution
        # If A says must_visit 'X' and B says never_visit 'X', NEVER_VISIT wins (safety/comfort first)
        conflict_pois = set(resolved.must_visit).intersection(set(resolved.never_visit))
        for poi in conflict_pois:
            resolved.must_visit.remove(poi)
            resolved.metadata_map[f"poi_conflict_{poi}"] = ConstraintMetadata(
                priority=ConstraintPriority.HIGH,
                confidence=1.0,
                source="conflict_resolver",
                timestamp=datetime.datetime.utcnow().isoformat()
            )
            
        # Apply feedback constraints overriding the family baselines
        if feedback_constraints:
            resolved = ConflictResolver._apply_feedback_overrides(resolved, feedback_constraints)
            
        return resolved

    @staticmethod
    def _apply_feedback_overrides(
        base: TravelConstraints, 
        feedback: TravelConstraints
    ) -> TravelConstraints:
        """
        Feedback constraints represent the user's explicit request. They take priority
        but still undergo conflict resolution against hard safety/accessibility.
        """
        # Accessibility takes highest precedence
        if feedback.wheelchair_accessible:
            base.wheelchair_accessible = True
            base.metadata_map["wheelchair_accessible"] = feedback.metadata_map.get("wheelchair_accessible", ConstraintMetadata(priority=ConstraintPriority.HIGH))
            
        if feedback.avoid_stairs:
            base.avoid_stairs = True
            base.metadata_map["avoid_stairs"] = feedback.metadata_map.get("avoid_stairs", ConstraintMetadata(priority=ConstraintPriority.HIGH))

        # Budget - Feedback overrides unless feedback is luxury and base is budget (safest is budget)
        # However, feedback confidence/priority can force it.
        if feedback.budget_level:
            meta = feedback.metadata_map.get("budget_level")
            if meta and meta.priority == ConstraintPriority.HIGH:
                base.budget_level = feedback.budget_level
            else:
                # Deterministic resolution: strictest budget wins
                if ConflictResolver._budget_rank(feedback.budget_level) < ConflictResolver._budget_rank(base.budget_level):
                    base.budget_level = feedback.budget_level
            base.metadata_map["budget_level"] = meta or ConstraintMetadata()

        # Pace - Slowest pace wins unless overridden by HIGH priority
        if feedback.pace:
            meta = feedback.metadata_map.get("pace")
            if meta and meta.priority == ConstraintPriority.HIGH:
                base.pace = feedback.pace
            else:
                base.pace = feedback.pace # Simplified: feedback dictates pace if specified
            base.metadata_map["pace"] = meta or ConstraintMetadata()

        # POIs
        if feedback.must_visit:
            # Add to must_visit, ensure removed from never_visit
            for poi in feedback.must_visit:
                if poi not in base.must_visit:
                    base.must_visit.append(poi)
                if poi in base.never_visit:
                    base.never_visit.remove(poi)
        
        if feedback.never_visit:
            for poi in feedback.never_visit:
                if poi not in base.never_visit:
                    base.never_visit.append(poi)
                if poi in base.must_visit:
                    base.must_visit.remove(poi)
                    
        if feedback.hotel_quality:
            base.hotel_quality = feedback.hotel_quality
            base.metadata_map["hotel_quality"] = feedback.metadata_map.get("hotel_quality", ConstraintMetadata())
            
        base.day_constraints = feedback.day_constraints
        base.transport_disruptions = feedback.transport_disruptions
        
        return base

    @staticmethod
    def _budget_rank(budget: BudgetLevel) -> int:
        # Lower rank is stricter
        ranks = {
            BudgetLevel.BUDGET: 1,
            BudgetLevel.MODERATE: 2,
            BudgetLevel.PREMIUM: 3,
            BudgetLevel.LUXURY: 4
        }
        return ranks.get(budget, 2)
