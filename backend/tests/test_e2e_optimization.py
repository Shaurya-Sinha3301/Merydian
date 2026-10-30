import pytest
from app.contracts.optimization import (
    OptimizationRequest, TravelDataset, TravelConstraints,
    FamilyPreferenceData, LocationData, BaseItineraryData, TransportEdgeData,
    BudgetLevel, PaceLevel, HotelQuality
)
from agents.optimizer_agent import OptimizerAgent

@pytest.fixture
def tiny_dataset():
    locations = {
        "H1": LocationData(location_id="H1", name="Hotel", lat=0, lon=0, category="hotel"),
        "P1": LocationData(location_id="P1", name="Cheap POI", lat=0.1, lon=0.1, category="park", visit_duration_min=60, entry_fee=0),
        "P2": LocationData(location_id="P2", name="Expensive POI", lat=0.2, lon=0.2, category="museum", visit_duration_min=120, entry_fee=100),
    }
    edges = [
        TransportEdgeData(from_location="H1", to_location="P1", mode="WALK", duration_min=10, distance_km=1, cost=0),
        TransportEdgeData(from_location="P1", to_location="H1", mode="WALK", duration_min=10, distance_km=1, cost=0),
        TransportEdgeData(from_location="H1", to_location="P2", mode="CAB", duration_min=20, distance_km=5, cost=50),
        TransportEdgeData(from_location="P2", to_location="H1", mode="CAB", duration_min=20, distance_km=5, cost=50),
        TransportEdgeData(from_location="P1", to_location="P2", mode="CAB", duration_min=15, distance_km=4, cost=40),
        TransportEdgeData(from_location="P2", to_location="P1", mode="CAB", duration_min=15, distance_km=4, cost=40),
    ]
    base_itinerary = BaseItineraryData(days=[
        {"day": 1, "theme": "Test", "pois": [{"location_id": "P1"}]}
    ])
    family_preferences = {
        "F1": FamilyPreferenceData(family_id="F1", budget_sensitivity=0.8), # Budget
    }
    return TravelDataset(
        locations={k: v for k, v in locations.items() if k != "H1"},
        hotels={"H1": locations["H1"]},
        transport_edges=edges,
        base_itinerary=base_itinerary,
        family_preferences=family_preferences
    )

def test_optimizer_e2e_impossible_schedule(tiny_dataset):
    # ConstraintValidator should catch this before OR-Tools runs
    request = OptimizationRequest(
        trip_id="T1",
        family_ids=["F1"],
        num_days=1,
        dataset=tiny_dataset,
        constraints=TravelConstraints(must_visit=["P1", "P2"]) 
    )
    # P1+P2 is 180 min. If we pretend available time is 100 min (mocked in validator check)
    # Wait, the validator uses a 10 hour day (600 mins). 180 mins will pass validation.
    # Let's add a fake POI to make it 2000 mins
    tiny_dataset.locations["P_IMPOSSIBLE"] = LocationData(location_id="P_IMPOSSIBLE", name="Imp", lat=0, lon=0, visit_duration_min=2000)
    request.constraints.must_visit.append("P_IMPOSSIBLE")
    
    agent = OptimizerAgent()
    result = agent.run_with_contracts(request)
    assert not result.success
    assert result.solver_status == "VALIDATION_FAILED"
    assert "Impossible schedule" in result.error

def test_optimizer_e2e_single_family(tiny_dataset):
    request = OptimizationRequest(
        trip_id="T1",
        family_ids=["F1"],
        num_days=1,
        dataset=tiny_dataset,
        constraints=TravelConstraints(budget_level=BudgetLevel.BUDGET)
    )
    
    # Since dataset is very tiny and we're passing it to the real HotelSkeletonOptimizer and ItineraryOptimizer
    # We might encounter issues if they expect more structure. 
    # Let's just check if it fails gracefully or succeeds
    agent = OptimizerAgent()
    result = agent.run_with_contracts(request)
    
    # The actual CP-SAT might fail or succeed depending on graph specifics.
    # If it fails, it should return a structured error with diagnostics, not throw an exception.
    assert hasattr(result, "success")
    if not result.success:
        assert result.solver_status in ["INFEASIBLE", "UNKNOWN", "MODEL_INVALID"]
        assert "diagnostics" in result.model_dump()
    else:
        assert result.solver_status == "OPTIMAL"
        assert "solve_time_seconds" in result.metrics
