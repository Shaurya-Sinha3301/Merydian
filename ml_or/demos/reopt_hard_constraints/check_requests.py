import json
from pathlib import Path

# Check iteration 2: FAM_A should have Akshardham (LOC_006)
sol2_path = Path('ml_or/demos/reopt_hard_constraints/output/demo_trip_20260202_174142/iteration_2/optimized_solution.json')
with open(sol2_path) as f:
    sol2 = json.load(f)

# Navigate: days -> families dict -> FAM_A -> pois list
fam_a_locs = []
for day in sol2['days']:
    if 'FAM_A' in day.get('families', {}):
        fam_a_pois = day['families']['FAM_A'].get('pois', [])
        fam_a_locs.extend([poi['location_id'] for poi in fam_a_pois if 'location_id' in poi])

print("=" * 80)
print("ITERATION 2 - FAM_A Must-Visit Akshardham Request")
print("=" * 80)
print(f"FAM_A has Akshardham (LOC_006)? {('LOC_006' in fam_a_locs)}")
print(f"FAM_A locations ({len(fam_a_locs)} total):")
for i, loc in enumerate([l for l in fam_a_locs if l.startswith('LOC_')], 1):
    print(f"  {i}. {loc}")

# Check iteration 2: FAM_B baseline (should have Lodhi Gardens before never-visit)
fam_b_locs_iter2 = []
for day in sol2['days']:
    if 'FAM_B' in day.get('families', {}):
        fam_b_pois = day['families']['FAM_B'].get('pois', [])
        fam_b_locs_iter2.extend([poi['location_id'] for poi in fam_b_pois if 'location_id' in poi])

print(f"\n[Baseline Check] Iteration 2 - FAM_B still has Lodhi Gardens (LOC_013)? {('LOC_013' in fam_b_locs_iter2)}")

# Check iteration 3: FAM_B should NOT have Lodhi Gardens (LOC_013)
sol3_path = Path('ml_or/demos/reopt_hard_constraints/output/demo_trip_20260202_174142/iteration_3/optimized_solution.json')
with open(sol3_path) as f:
    sol3 = json.load(f)

fam_b_locs = []
for day in sol3['days']:
    if 'FAM_B' in day.get('families', {}):
        fam_b_pois = day['families']['FAM_B'].get('pois', [])
        fam_b_locs.extend([poi['location_id'] for poi in fam_b_pois if 'location_id' in poi])

print("\n" + "=" * 80)
print("ITERATION 3 - FAM_B Never-Visit Lodhi Gardens Request")
print("=" * 80)
print(f"FAM_B has Lodhi Gardens (LOC_013)? {('LOC_013' in fam_b_locs)}")
print(f"FAM_B locations ({len(fam_b_locs)} total):")
for i, loc in enumerate([l for l in fam_b_locs if l.startswith('LOC_')], 1):
    print(f"  {i}. {loc}")

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
satisfied_1 = 'LOC_006' in fam_a_locs
satisfied_2 = 'LOC_013' not in fam_b_locs
print(f"{'✓' if satisfied_1 else '✗'} Request 1 (FAM_A must-visit Akshardham LOC_006): {'SATISFIED' if satisfied_1 else 'NOT SATISFIED'}")
print(f"{'✓' if satisfied_2 else '✗'} Request 2 (FAM_B never-visit Lodhi Gardens LOC_013): {'SATISFIED' if satisfied_2 else 'NOT SATISFIED'}")
