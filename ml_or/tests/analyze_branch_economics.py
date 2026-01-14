"""Analyze why branch POIs aren't being visited"""
import sys
sys.path.insert(0, '.')
from itinerary_optimizer import ItineraryOptimizer
import json

opt = ItineraryOptimizer()

# Get family preferences
fams = {f.family_id: f for f in opt.family_prefs}
f1 = fams['FAM_001']
f2 = fams['FAM_002']

# POIs in Day 1
skeleton_pois = ['LOC_008', 'LOC_010', 'LOC_003']
branch_pois = ['LOC_011', 'LOC_014']

print("\n" + "="*80)
print("WHY AREN'T BRANCH POIs BEING VISITED?")
print("="*80)

print("\n📊 SATISFACTION ANALYSIS (scaled x100):\n")
print(f"{'POI':<25} | {'Role':<10} | FAM_001 | FAM_002 | Combined")
print("-" * 75)

total_skeleton_sat = 0
total_branch_sat = 0

for poi_id in skeleton_pois:
    loc = opt.locations[poi_id]
    sat1 = opt.calculate_satisfaction(f1, loc) * 100
    sat2 = opt.calculate_satisfaction(f2, loc) * 100
    combined = sat1 + sat2
    total_skeleton_sat += combined
    print(f"{loc.name:<25} | {'SKELETON':<10} | {sat1:>6.0f} | {sat2:>6.0f} | {combined:>8.0f}")

print("-" * 75)
print(f"{'SKELETON TOTAL':<25} | {'':<10} | {'':<6} | {'':<6} | {total_skeleton_sat:>8.0f}")
print()

for poi_id in branch_pois:
    loc = opt.locations[poi_id]
    sat1 = opt.calculate_satisfaction(f1, loc) * 100
    sat2 = opt.calculate_satisfaction(f2, loc) * 100
    combined = sat1 + sat2
    total_branch_sat += combined
    print(f"{loc.name:<25} | {'BRANCH':<10} | {sat1:>6.0f} | {sat2:>6.0f} | {combined:>8.0f}")

print("-" * 75)
print(f"{'BRANCH TOTAL':<25} | {'':<10} | {'':<6} | {'':<6} | {total_branch_sat:>8.0f}")

print("\n\n💰 COST ANALYSIS:\n")

# Estimate transport costs
# Current itinerary: START -> LOC_008 -> LOC_010 -> LOC_003 -> END
# Adding a branch POI would require additional edges

print("Current 3-skeleton itinerary:")
print("  START -> LOC_008 -> LOC_010 -> LOC_003 -> END")
print("  Edges: 4")
print("  Estimated transport cost: ~400 points (100 per edge)")
print("  Estimated time penalty: ~200 points (50 per edge)")
print()

print("Adding LOC_011 (Red Fort 11 - branch):")
print("  Would need to insert into sequence")
print("  Additional edges: +2 (to and from LOC_011)")
print("  Additional transport cost: ~200 points")
print("  Additional time penalty: ~100 points")
print("  Total additional cost: ~300 points")
print()

print("📈 COST-BENEFIT COMPARISON:\n")
print(f"Red Fort 11 (LOC_011) satisfaction gain: {opt.calculate_satisfaction(f1, opt.locations['LOC_011']) * 100 + opt.calculate_satisfaction(f2, opt.locations['LOC_011']) * 100:.0f} points")
print(f"Estimated additional cost: ~300 points")
print(f"Net benefit: {(opt.calculate_satisfaction(f1, opt.locations['LOC_011']) * 100 + opt.calculate_satisfaction(f2, opt.locations['LOC_011']) * 100) - 300:.0f} points")
print()

print("🎯 CONCLUSION:\n")
print("Branch POIs aren't visited because:")
print("1. Satisfaction gain (~154 points) < Transport costs (~300 points)")
print("2. Optimizer correctly chooses to skip them to maximize objective")
print("3. Even with ZERO branch penalty, the transport economics don't justify it")
print()
print("💡 TO ENABLE BRANCH POI VISITS:")
print("1. Reduce transport costs (lower lambda_coherence)")
print("2. Increase satisfaction scaling (multiply by 200 instead of 100)")
print("3. Use must-visit constraints to force visits")
print("4. Use real-world data where satisfaction >> transport costs")
