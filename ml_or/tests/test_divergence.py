"""Test divergence after satisfaction fix"""
import sys
sys.path.insert(0, '.')
from itinerary_optimizer import ItineraryOptimizer

opt = ItineraryOptimizer()
result = opt.optimize_multi_family_single_day(['FAM_001', 'FAM_002'], 0, 5, 60, 0.05)

print("\n=== AFTER SATISFACTION FIX ===\n")
print(f"Shared skeleton order: {result['shared_poi_order']}")
print(f"Objective: {result['objective_value']:.2f}\n")

for fid in ['FAM_001', 'FAM_002']:
    fdata = result['families'][fid]
    print(f"{fid}:")
    print(f"  Total satisfaction: {fdata['total_satisfaction']}")
    print(f"  POIs visited ({len(fdata['pois'])}):")
    for p in fdata['pois']:
        loc_id = p['location_id']
        role = opt.locations[loc_id].role
        print(f"    - {p['location_name']} ({role}) sat={p['satisfaction_score']:.2f}")
    print()

# Check for divergence
fam1_pois = set([p['location_id'] for p in result['families']['FAM_001']['pois']])
fam2_pois = set([p['location_id'] for p in result['families']['FAM_002']['pois']])
overlap = len(fam1_pois & fam2_pois)
total = len(fam1_pois | fam2_pois)
diverged = fam1_pois ^ fam2_pois

print(f"📊 Divergence Analysis:")
print(f"  Overlap: {overlap}/{total} POIs")
print(f"  Diverged POIs: {[opt.locations[p].name for p in diverged] if diverged else 'None'}")
print(f"  🎉 DIVERGENCE: {'YES!!!' if diverged else 'NO'}")
