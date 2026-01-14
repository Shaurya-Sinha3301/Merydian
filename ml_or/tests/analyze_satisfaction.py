"""Analyze satisfaction scores for all POIs to understand divergence behavior"""

import sys
sys.path.insert(0, 'ml_or')

from itinerary_optimizer import ItineraryOptimizer

opt = ItineraryOptimizer()
families_dict = {f.family_id: f for f in opt.family_prefs}
fam1 = families_dict['FAM_001']
fam2 = families_dict['FAM_002']

pois = ['LOC_008', 'LOC_011', 'LOC_010', 'LOC_014', 'LOC_003']

print("="*80)
print("POI SATISFACTION ANALYSIS")
print("="*80)
print()
print("Family Interests:")
print(f"FAM_001: {fam1.interest_vector}")
print(f"FAM_002: {fam2.interest_vector}")
print()
print("="*80)
print(f"{'POI Name':<25} | {'FAM_001':<8} | {'FAM_002':<8} | {'Diff':<6} | Tags")
print("="*80)

for poi_id in pois:
    loc = opt.locations[poi_id]
    sat1 = opt._calculate_satisfaction(fam1, loc)
    sat2 = opt._calculate_satisfaction(fam2, loc)
    diff = abs(sat1 - sat2)
    tags_str = ', '.join(loc.tags)
    print(f"{loc.name:<25} | {sat1:>7.2f} | {sat2:>7.2f} | {diff:>5.2f} | {tags_str}")

print("="*80)
print()
print("Analysis:")
print("- Divergence penalty per POI: 5 points (lambda_divergence=0.05 * 100)")
print("- For divergence to be worth it, satisfaction difference must be > 5 points")
print("- Current max difference: Check above table")
print()
