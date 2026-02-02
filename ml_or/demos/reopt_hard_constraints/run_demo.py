"""
Re-Optimization Demo - Hard Constraints Only
=============================================

This demo showcases stateful re-optimization with must-visit and never-visit constraints.

Flow:
1. Phase 1: Generate baseline itinerary (no constraints)
2. Phase 2: Add must-visit constraint, re-optimize
3. Phase 3: Add never-visit constraint (dynamically detected), re-optimize

Each phase uses the SAME base_itinerary with UPDATED family preferences.
"""

import sys
import json
from pathlib import Path
from datetime import datetime

# Add project root to path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from ml_or.itinerary_optimizer import ItineraryOptimizer
from ml_or.explainability.diff_engine import ItineraryDiffEngine
from agents.explainability_agent import ExplainabilityAgent


class ReoptimizationDemo:
    """Orchestrates the three-phase re-optimization demo."""
    
    def __init__(self):
        self.demo_dir = Path(__file__).parent
        self.data_dir = self.demo_dir / "data"
        self.output_dir = self.demo_dir / "output"
        self.output_dir.mkdir(exist_ok=True)
        
        # Core data files (shared across all phases)
        self.locations_file = str(project_root / "ml_or" / "data" / "locations.json")
        self.transport_file = str(project_root / "ml_or" / "data" / "transport_graph.json")
        self.base_itinerary_file = str(project_root / "ml_or" / "data" / "base_itinerary_final.json")
        
        # Preference files (change per phase)
        self.baseline_prefs = str(self.data_dir / "family_preferences_baseline.json")
        self.must_visit_prefs = str(self.data_dir / "family_preferences_must_visit.json")
        self.never_visit_prefs = str(self.data_dir / "family_preferences_never_visit.json")
        
        # Explainability agent
        self.exp_agent = ExplainabilityAgent()
        
        print("=" * 80)
        print("RE-OPTIMIZATION DEMO - HARD CONSTRAINTS ONLY")
        print("=" * 80)
        print(f"\nDemo directory: {self.demo_dir}")
        print(f"Output directory: {self.output_dir}\n")
    
    def run(self):
        """Execute all three phases sequentially."""
        
        # Phase 1: Baseline
        print("\n" + "=" * 80)
        print("PHASE 1: BASELINE ITINERARY (No Constraints)")
        print("=" * 80)
        itinerary_v0_path = self.phase1_baseline()
        
        if not itinerary_v0_path:
            print("X Phase 1 failed. Aborting demo.")
            return
        
        # Phase 2: Must-Visit
        print("\n" + "=" * 80)
        print("PHASE 2: MUST-VISIT RE-OPTIMIZATION")
        print("=" * 80)
        itinerary_v1_path = self.phase2_must_visit(itinerary_v0_path)
        
        if not itinerary_v1_path:
            print("X Phase 2 failed. Aborting demo.")
            return
        
        # Phase 3: Never-Visit
        print("\n" + "=" * 80)
        print("PHASE 3: NEVER-VISIT RE-OPTIMIZATION (Dynamic POI Detection)")
        print("=" * 80)
        itinerary_v2_path = self.phase3_never_visit(itinerary_v1_path)
        
        # Summary
        print("\n" + "=" * 80)
        print("DEMO COMPLETED SUCCESSFULLY")
        print("=" * 80)
        print(f"\n All outputs saved to: {self.output_dir}")
        print(f"\nGenerated itineraries:")
        print(f"  - itinerary_v0.json (baseline)")
        print(f"  - itinerary_v1_must_visit.json")
        if itinerary_v2_path:
            print(f"  - itinerary_v2_never_visit.json")
    
    def phase1_baseline(self):
        """Phase 1: Generate baseline itinerary with no constraints."""
        print("\n📋 Using preferences: family_preferences_baseline.json")
        print("   - FAM_A: High history/religious, low nightlife")
        print("   - FAM_B: High food/nightlife/shopping, low religious")
        print("   - FAM_C: Balanced across all categories")
        print("   - All families have ZERO must-visit and never-visit constraints\n")
        
        # Create optimizer with baseline preferences
        optimizer = ItineraryOptimizer(
            locations_file=self.locations_file,
            transport_file=self.transport_file,
            base_itinerary_file=self.base_itinerary_file,
            family_prefs_file=self.baseline_prefs
        )
        
        # Optimize
        print("🔄 Running optimizer...")
        itinerary_v0 = optimizer.optimize_trip(
            family_ids=["FAM_A", "FAM_B", "FAM_C"],
            num_days=3,
            lambda_divergence=0.05
        )
        
        if not itinerary_v0:
            print("X Optimizer failed to generate baseline solution")
            return None
        
        # Save
        v0_path = self.output_dir / "itinerary_v0.json"
        with open(v0_path, 'w') as f:
            json.dump(itinerary_v0, f, indent=2)
        
        print(f" Baseline itinerary generated: {v0_path.name}")
        
        # Analyze
        self._analyze_itinerary(itinerary_v0, "Baseline")
        
        return v0_path
    
    def phase2_must_visit(self, baseline_path):
        """Phase 2: Re-optimize with must-visit constraint (Akshardham)."""
        print("\n📋 Simulated user input:")
        print('   FAM_A: "I definitely want to visit Akshardham."\n')
        
        # Load baseline for comparison
        with open(baseline_path, 'r') as f:
            baseline_itinerary = json.load(f)
        
        # Create optimizer with must-visit preferences
        # NOTE: SAME base_itinerary, DIFFERENT family preferences
        optimizer = ItineraryOptimizer(
            locations_file=self.locations_file,
            transport_file=self.transport_file,
            base_itinerary_file=self.base_itinerary_file,  # SAME
            family_prefs_file=self.must_visit_prefs         # UPDATED
        )
        
        print("🎯 Must-visit POI: Akshardham (LOC_006)")
        print(f"🔄 Running optimizer with updated preferences...")
        
        # Optimize
        itinerary_v1 = optimizer.optimize_trip(
            family_ids=["FAM_A", "FAM_B", "FAM_C"],
            num_days=3,
            lambda_divergence=0.05
        )
        
        if not itinerary_v1:
            print("X Optimizer failed to generate solution")
            return None
        
        # Save
        v1_path = self.output_dir / "itinerary_v1_must_visit.json"
        with open(v1_path, 'w') as f:
            json.dump(itinerary_v1, f, indent=2)
        
        print(f" Must-visit itinerary generated: {v1_path.name}")
        
        # Analyze
        self._analyze_itinerary(itinerary_v1, "Must-Visit (v1)")
        
        return v1_path
    
    def phase3_never_visit(self, v1_path):
        """Phase 3: Re-optimize with never-visit constraint (dynamically detected)."""
        print("\n🔍 Detecting Branch POIs from itinerary_v1...")
        
        # Load v1 itinerary
        with open(v1_path, 'r') as f:
            itinerary_v1 = json.load(f)
        
        # Detect first Branch POI
        branch_poi = self._detect_branch_poi(itinerary_v1)
        
        if not branch_poi:
            print("!  No Branch POI found in itinerary_v1. Skipping Phase 3.")
            print("   (This is acceptable - customer can't exclude what's not there)")
            return None
        
        poi_name = self._get_poi_name(branch_poi)
        print(f" Detected Branch POI: {poi_name} ({branch_poi})")
        print(f'\n📋 Simulated user input:')
        print(f'   FAM_B: "I don\'t want to visit {poi_name}."\n')
        
        # Update never-visit preferences dynamically
        with open(self.never_visit_prefs, 'r') as f:
            prefs = json.load(f)
        
        for fam in prefs:
            if fam['family_id'] == 'FAM_B':
                fam['never_visit_locations'] = [branch_poi]
                fam['notes'] = f"Excludes {poi_name}."
        
        # Save updated preferences
        updated_prefs_path = self.data_dir / "family_preferences_never_visit_updated.json"
        with open(updated_prefs_path, 'w') as f:
            json.dump(prefs, f, indent=2)
        
        # Create optimizer with never-visit preferences
        # NOTE: SAME base_itinerary, DIFFERENT family preferences
        optimizer = ItineraryOptimizer(
            locations_file=self.locations_file,
            transport_file=self.transport_file,
            base_itinerary_file=self.base_itinerary_file,  # SAME
            family_prefs_file=str(updated_prefs_path)       # UPDATED
        )
        
        print(f"🎯 Never-visit POI: {poi_name} ({branch_poi})")
        print(f"🔄 Running optimizer with updated preferences...")
        
        # Optimize
        itinerary_v2 = optimizer.optimize_trip(
            family_ids=["FAM_A", "FAM_B", "FAM_C"],
            num_days=3,
            lambda_divergence=0.05
        )
        
        if not itinerary_v2:
            print("X Optimizer failed to generate solution")
            return None
        
        # Save
        v2_path = self.output_dir / "itinerary_v2_never_visit.json"
        with open(v2_path, 'w') as f:
            json.dump(itinerary_v2, f, indent=2)
        
        print(f" Never-visit itinerary generated: {v2_path.name}")
        
        # Analyze
        self._analyze_itinerary(itinerary_v2, "Never-Visit (v2)")
        
        return v2_path
    
    def _detect_branch_poi(self, itinerary):
        """Detect the first Branch POI in the itinerary."""
        # Load locations
        with open(self.locations_file, 'r') as f:
            locations_list = json.load(f)
        
        locations_map = {loc['location_id']: loc for loc in locations_list}
        
        # Check all days
        for day_data in itinerary.get('days', []):
            families_data = day_data.get('families', {})
            for family_id, family_data in families_data.items():
                for poi in family_data.get('pois', []):
                    poi_id = poi.get('location_id')
                    if poi_id in locations_map:
                        role = locations_map[poi_id].get('role', 'BRANCH')
                        if role != "SKELETON":
                            return poi_id
        
        return None
    
    def _get_poi_name(self, poi_id):
        """Get POI name from locations."""
        with open(self.locations_file, 'r') as f:
            locations_list = json.load(f)
        
        for loc in locations_list:
            if loc['location_id'] == poi_id:
                return loc.get('name', poi_id)
        
        return poi_id
    
    def _analyze_itinerary(self, itinerary, label):
        """Print summary of itinerary POIs."""
        print(f"\n📊 {label} Itinerary Analysis:")
        
        # Load locations
        with open(self.locations_file, 'r') as f:
            locations_list = json.load(f)
        
        locations_map = {loc['location_id']: loc for loc in locations_list}
        poi_set = set()
        
        # Iterate through days
        for day_data in itinerary.get('days', []):
            day_num = day_data.get('day')
            families_data = day_data.get('families', {})
            
            # Iterate through families
            for family_id, family_data in families_data.items():
                day_pois = []
                for poi in family_data.get('pois', []):
                    poi_id = poi.get('location_id')
                    poi_set.add(poi_id)
                    poi_name = locations_map.get(poi_id, {}).get('name', poi_id)
                    role = locations_map.get(poi_id, {}).get('role', 'BRANCH')
                    day_pois.append(f"{poi_name} [{role}]")
                
                if day_pois and day_num <= 1:  # Only show Day 1 to keep output concise
                    print(f"   {family_id} Day {day_num}: {', '.join(day_pois[:3])}{'...' if len(day_pois) > 3 else ''}")
        
        # Count Branch vs Skeleton
        branch_count = 0
        skeleton_count = 0
        for poi_id in poi_set:
            if poi_id in locations_map:
                role = locations_map[poi_id].get('role', 'BRANCH')
                if role == "SKELETON":
                    skeleton_count += 1
                else:
                    branch_count += 1
        
        print(f"   Total POIs: {len(poi_set)} (Skeleton: {skeleton_count}, Branch: {branch_count})")


def main():
    demo = ReoptimizationDemo()
    demo.run()


if __name__ == "__main__":
    main()
