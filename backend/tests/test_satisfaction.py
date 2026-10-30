import pytest
from ml_or.itinerary_optimizer import ItineraryOptimizer, Location, FamilyPreference

@pytest.fixture
def optimizer():
    class DummyOptimizer(ItineraryOptimizer):
        def __init__(self):
            pass
    return DummyOptimizer()

def test_satisfaction_perfect_match(optimizer):
    fam = FamilyPreference(
        family_id="F1", members=2, children=0, budget_sensitivity=0.5,
        energy_level=1.0, interest_vector={"history": 1.0, "art": 1.0},
        must_visit_locations=[], never_visit_locations=[]
    )
    loc = Location(
        location_id="L1", name="Museum", type="POI", category="HARD_POI",
        lat=0.0, lng=0.0, avg_visit_time_min=60, cost=10, repeatable=False,
        tags=["history", "art"], base_importance=1.0
    )
    
    score = optimizer.calculate_satisfaction(fam, loc)
    assert score == 100.0

def test_satisfaction_partial_match(optimizer):
    fam = FamilyPreference(
        family_id="F1", members=2, children=0, budget_sensitivity=0.5,
        energy_level=1.0, interest_vector={"history": 1.0, "art": 0.0},
        must_visit_locations=[], never_visit_locations=[]
    )
    loc = Location(
        location_id="L1", name="Museum", type="POI", category="HARD_POI",
        lat=0.0, lng=0.0, avg_visit_time_min=60, cost=10, repeatable=False,
        tags=["history", "art"], base_importance=1.0
    )
    
    score = optimizer.calculate_satisfaction(fam, loc)
    assert score == 75.0

def test_satisfaction_no_tags(optimizer):
    fam = FamilyPreference(
        family_id="F1", members=2, children=0, budget_sensitivity=0.5,
        energy_level=1.0, interest_vector={"history": 1.0},
        must_visit_locations=[], never_visit_locations=[]
    )
    loc = Location(
        location_id="L1", name="Park", type="POI", category="HARD_POI",
        lat=0.0, lng=0.0, avg_visit_time_min=60, cost=10, repeatable=False,
        tags=[], base_importance=0.5
    )
    
    score = optimizer.calculate_satisfaction(fam, loc)
    assert score == 25.0

def test_satisfaction_fatigue_penalty(optimizer):
    fam = FamilyPreference(
        family_id="F1", members=2, children=0, budget_sensitivity=0.5,
        energy_level=0.5, # low energy
        interest_vector={"history": 1.0, "art": 1.0},
        must_visit_locations=[], never_visit_locations=[]
    )
    loc = Location(
        location_id="L1", name="Huge Museum", type="POI", category="HARD_POI",
        lat=0.0, lng=0.0, avg_visit_time_min=120, # > 90 mins
        cost=10, repeatable=False,
        tags=["history", "art"], base_importance=1.0
    )
    
    score = optimizer.calculate_satisfaction(fam, loc)
    assert score == 80.0
