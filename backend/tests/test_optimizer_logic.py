import pytest
from app.contracts.optimization import (
    TravelConstraints, FamilyPreferenceData, BudgetLevel, PaceLevel,
    OptimizationRequest, TravelDataset, BaseItineraryData
)
from app.services.conflict_resolver import ConflictResolver
from app.services.constraint_validator import ConstraintValidator

def test_conflict_resolver_budget():
    fam1 = FamilyPreferenceData(family_id="F1", budget_sensitivity=1.0) # BUDGET
    fam2 = FamilyPreferenceData(family_id="F2", budget_sensitivity=0.0) # LUXURY
    
    # ConflictResolver should pick stricter budget (BUDGET)
    resolved = ConflictResolver.resolve([fam1, fam2])
    assert resolved.budget_level == BudgetLevel.BUDGET

def test_conflict_resolver_poi_conflict():
    fam1 = FamilyPreferenceData(family_id="F1", must_visit_locations=["LOC_A"], never_visit_locations=["LOC_B"])
    fam2 = FamilyPreferenceData(family_id="F2", must_visit_locations=["LOC_B"], never_visit_locations=["LOC_A"])
    
    resolved = ConflictResolver.resolve([fam1, fam2])
    # Hard constraint safety: NEVER_VISIT wins over MUST_VISIT
    assert "LOC_A" not in resolved.must_visit
    assert "LOC_B" not in resolved.must_visit
    assert "LOC_A" in resolved.never_visit
    assert "LOC_B" in resolved.never_visit

def test_constraint_validator_missing_graph():
    # Empty dataset
    dataset = TravelDataset(
        locations={},
        hotels={},
        transport_edges=[],
        base_itinerary=BaseItineraryData(days=[{}]),
        family_preferences={"F1": FamilyPreferenceData(family_id="F1")}
    )
    request = OptimizationRequest(
        trip_id="T1",
        family_ids=["F1"],
        num_days=3,
        dataset=dataset,
        constraints=TravelConstraints()
    )
    
    result = ConstraintValidator.validate(request)
    assert not result.valid
    assert any("has no locations" in e for e in result.errors)
    assert any("Transport graph is completely empty" in e for e in result.errors)
    
def test_constraint_validator_impossible_schedule():
    from app.contracts.optimization import LocationData
    dataset = TravelDataset(
        locations={
            "L1": LocationData(location_id="L1", name="L1", lat=0, lon=0, visit_duration_min=1000),
            "L2": LocationData(location_id="L2", name="L2", lat=0, lon=0, visit_duration_min=1000)
        },
        hotels={},
        transport_edges=[],
        base_itinerary=BaseItineraryData(days=[{}]),
        family_preferences={"F1": FamilyPreferenceData(family_id="F1")}
    )
    request = OptimizationRequest(
        trip_id="T1",
        family_ids=["F1"],
        num_days=1,
        dataset=dataset,
        constraints=TravelConstraints(must_visit=["L1", "L2"])
    )
    
    result = ConstraintValidator.validate(request)
    assert not result.valid
    assert any("Impossible schedule" in e for e in result.errors)
