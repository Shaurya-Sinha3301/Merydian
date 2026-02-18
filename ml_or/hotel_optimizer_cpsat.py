"""
CP-SAT Hotel & Skeleton Route Optimizer
=======================================

This module implements a joint optimization model for:
1.  **Hotel Selection**: Choosing the best hotel for each family per day/block.
2.  **Skeleton Route Optimization**: Ordering the mandatory "Skeleton" POIs for each day to minimize travel,
    using the selected hotel as the Start/End anchor.

Input:
- locations.json: All POIs and Hotels.
- base_itinerary.json: Daily list of SKELETON POIs.
- family_preferences.json: Constraints (Budget, Interests).

Output:
- optimized_backbone.json:
    - Daily Hotel Assignments
    - Optimized Skeleton Route (Hotel -> POI_A -> POI_B -> ... -> Hotel)
"""

import json
import math
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass
from ortools.sat.python import cp_model

# Reuse or Redefine Data Structures (Redefining for independence/portability)
@dataclass
class Location:
    location_id: str
    name: str
    type: str
    lat: float
    lng: float
    avg_visit_time_min: int
    cost: float
    tags: List[str]
    role: str = "SKELETON"

@dataclass
class FamilyPreference:
    family_id: str
    budget_sensitivity: float
    # Add other fields as needed for strict typing, but dict lookup is fine for prototype

class HotelSkeletonOptimizer:
    def __init__(self,
                 locations_file: str = "ml_or/data/locations.json",
                 base_itinerary_file: str = "ml_or/data/base_itinerary_clustered.json",
                 family_prefs_file: str = "ml_or/data/family_preferences_3fam_strict.json"):
        
        self.locations = self._load_locations(locations_file)
        self.base_itinerary = self._load_json(base_itinerary_file)
        self.family_prefs = self._load_json(family_prefs_file)
        
        # Configuration
        self.search_radius_km = 10.0  # Pool hotels within 10km of any Skeleton POI
        self.check_in_time = 1400     # 14:00
        self.check_out_time = 1100    # 11:00
        
        # Weights (Objective Function)
        self.w_satisfaction = 10.0
        self.w_travel_dist = -1.0     # Minimize distance (negative weight)
        self.w_hotel_cost = -0.01     # Minimize cost (scaled down)
        self.w_coherence = -500.0     # Penalty for splitting families
        self.w_switching = -200.0     # Penalty for switching hotels

    def _load_json(self, filepath: str):
        with open(filepath, 'r') as f:
            return json.load(f)

    def _load_locations(self, filepath: str) -> Dict[str, Location]:
        data = self._load_json(filepath)
        locs = {}
        for item in data:
            locs[item['location_id']] = Location(
                location_id=item['location_id'],
                name=item['name'],
                type=item['type'],
                lat=item['lat'],
                lng=item['lng'],
                avg_visit_time_min=item.get('avg_visit_time_min', 60),
                cost=item.get('cost', 0),
                tags=item.get('tags', []),
                role=item.get('role', 'SKELETON')
            )
        return locs

    def _haversine_distance(self, loc1: Location, loc2: Location) -> float:
        R = 6371  # Earth radius in km
        dlat = math.radians(loc2.lat - loc1.lat)
        dlon = math.radians(loc2.lng - loc1.lng)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(loc1.lat)) * math.cos(math.radians(loc2.lat)) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c

    def _get_skeleton_pois(self, day_index: int) -> List[str]:
        """Extract SKELETON POIs for a specific day."""
        if day_index >= len(self.base_itinerary['days']):
            return []
        
        day_data = self.base_itinerary['days'][day_index]
        return [
            p['location_id'] for p in day_data['pois']
            if p.get('role') == 'SKELETON' and p['location_id'] in self.locations
        ]

    def _pool_candidate_hotels(self, skeleton_pois: List[str]) -> List[str]:
        """Find hotels close to Any of the Skeleton POIs."""
        candidates = set()
        
        # 1. Identify Hotel Locations
        all_hotels = [lid for lid, loc in self.locations.items() if loc.type == 'HOTEL']
        
        if not skeleton_pois:
            return all_hotels # Fallback
            
        # 2. Filter by Radius
        for hotel_id in all_hotels:
            hotel_loc = self.locations[hotel_id]
            for poi_id in skeleton_pois:
                poi_loc = self.locations[poi_id]
                dist = self._haversine_distance(hotel_loc, poi_loc)
                if dist <= self.search_radius_km:
                    candidates.add(hotel_id)
                    break # Found at least one nearby POI
        
        return list(candidates)

    def optimize(self, output_file: Optional[str] = None):
        """Run the CP-SAT optimization."""
        model = cp_model.CpModel()
        
        # --- Sets ---
        days = range(len(self.base_itinerary['days']))
        families = [f['family_id'] for f in self.family_prefs]
        
        # Pre-calculate candidate hotels per day (Pooling)
        day_hotels = {}
        day_skeleton = {}
        
        all_candidate_hotels = set()
        
        for d in days:
            skeleton = self._get_skeleton_pois(d)
            hotels = self._pool_candidate_hotels(skeleton)
            if not hotels:
                 # Fallback: All hotels if pooling fails
                 hotels = [lid for lid, loc in self.locations.items() if loc.type == 'HOTEL']
            
            day_hotels[d] = hotels
            day_skeleton[d] = skeleton
            all_candidate_hotels.update(hotels)
            
            print(f"Day {d+1}: {len(skeleton)} Skeleton POIs, {len(hotels)} Candidate Hotels")

        # --- Decision Variables ---
        
        # 1. Hotel Selection: x[f, d, h]
        x = {} 
        for f in families:
            for d in days:
                for h in day_hotels[d]:
                    x[(f, d, h)] = model.NewBoolVar(f'hotel_{f}_{d}_{h}')

        # 2. Route Ordering: y[d, i, j] (TSP for Skeleton)
        # We need a unified route for the group (Skeleton is shared)
        # But wait, purely shared? Or implied shared?
        # The prompt says "Optimize Skeleton Route". Skeleton is by definition shared.
        # So we define ONE set of y[d, i, j] variables per day.
        # The Start/End node is determined by the Hotel choice.
        # This creates a linkage: If Hotel H is chosen, the Route must start/end at H.
        # Since families might (theoretically) choose different hotels, this complicates the "Shared" route.
        # CONSTRAINT: For the Skeleton Route to be "Shared", all families MUST start/end at the SAME location?
        # OR: The route is shared (POI -> POI), but the Start/End legs differ per family?
        # DECISION: To enforce Coherence, we heavily penalize different hotels. 
        # But geometrically, the "Skeleton Route" (P1->P2->P3) is what we rearrange.
        # The legs (Hotel->P1 and P3->Hotel) are family-specific.
        
        # Let's refactor: The order of Skeleton POIs is SHARED.
        # order[d, i, j] = 1 if Skeleton POI i is immediately before j.
        
        skeleton_order = {} # y_route[d, i, j]
        
        for d in days:
            pois = day_skeleton[d]
            if not pois: continue
            
            # Create variables for all permutations of POIs
            for i in pois:
                for j in pois:
                    if i != j:
                        skeleton_order[(d, i, j)] = model.NewBoolVar(f'route_{d}_{i}_{j}')
                        
        # 3. Family-Specific Legs (Hotel -> First POI, Last POI -> Hotel)
        # We need to know which POI is FIRST and which is LAST to connect to Hotel.
        # is_first[d, i], is_last[d, i]
        is_first = {}
        is_last = {}
        
        for d in days:
            pois = day_skeleton[d]
            for p in pois:
                is_first[(d, p)] = model.NewBoolVar(f'first_{d}_{p}')
                is_last[(d, p)] = model.NewBoolVar(f'last_{d}_{p}')

        # --- Constraints ---

        # 1. One Hotel per Family per Day
        for f in families:
            for d in days:
                model.Add(sum(x[(f, d, h)] for h in day_hotels[d]) == 1)

        # 2. Skeleton Route Constraints (TSP Logic)
        for d in days:
            pois = day_skeleton[d]
            if not pois: continue
            
            if len(pois) == 1:
                # Trivial case
                p = pois[0]
                model.Add(is_first[(d, p)] == 1)
                model.Add(is_last[(d, p)] == 1)
            else:
                # Generalized TSP for Path (Open Tour)
                # Each POI has exactly one successor (except Last)
                # Each POI has exactly one predecessor (except First)
                
                for p in pois:
                    # Sum of outgoing edges + is_last == 1
                    outgoing = [skeleton_order[(d, p, j)] for j in pois if p != j]
                    model.Add(sum(outgoing) + is_last[(d, p)] == 1)
                    
                    # Sum of incoming edges + is_first == 1
                    incoming = [skeleton_order[(d, j, p)] for j in pois if p != j]
                    model.Add(sum(incoming) + is_first[(d, p)] == 1)
                
                # Exactly one First and one Last
                model.Add(sum(is_first[(d, p)] for p in pois) == 1)
                model.Add(sum(is_last[(d, p)] for p in pois) == 1)
                
                # Subtour elimination (MTZ)
                u = {p: model.NewIntVar(0, len(pois), f'u_{d}_{p}') for p in pois}
                for i in pois:
                    for j in pois:
                        if i != j:
                            model.Add(u[i] - u[j] + len(pois) * skeleton_order[(d, i, j)] <= len(pois) - 1)

        # 3. Daily Consistency (Hotel Switching) & Cost Calculation
        
        # --- Objective Function Terms ---
        obj_hotel_satisfaction = [] # (Not implemented in data, assume 0 or tags)
        obj_travel_cost = []
        obj_hotel_cost = []
        obj_coherence = []
        obj_switching = []
        
        # Hotel Cost
        for f in families:
            for d in days:
                for h in day_hotels[d]:
                    cost = self.locations[h].cost
                    obj_hotel_cost.append(cost * x[(f, d, h)])

        # Travel Cost (Distance)
        # Part A: Skeleton Route (Shared) P_i -> P_j
        for d in days:
            pois = day_skeleton[d]
            for i in pois:
                for j in pois:
                    if i != j:
                        dist = self._haversine_distance(self.locations[i], self.locations[j])
                        # This route is taken by ALL families (Logic: Shared Skeleton)
                        # So cost is multiplied by NumFamilies? Or just once for the group?
                        # Let's count it once as "Group Efficiency", or per family.
                        # Usually per family if they travel separately, strict shared if together.
                        # Let's weight it as Group Distance.
                        obj_travel_cost.append(dist * skeleton_order[(d, i, j)] * len(families))
        
        # Part B: Hotel Legs (Hotel -> First POI, Last POI -> Hotel)
        # This depends on x[f,d,h] AND is_first[d,p]
        # We need linearization: z[f,d,h,p] = x[f,d,h] AND is_first[d,p]
        
        for f in families:
            for d in days:
                hotels = day_hotels[d]
                pois = day_skeleton[d]
                
                for h in hotels:
                    for p in pois:
                        # Leg 1: Hotel -> First POI
                        # Create z_start boolean
                        z_start = model.NewBoolVar(f'z_start_{f}_{d}_{h}_{p}')
                        model.AddBoolOr([x[(f, d, h)].Not(), is_first[(d, p)].Not(), z_start])
                        model.AddImplication(z_start, x[(f, d, h)])
                        model.AddImplication(z_start, is_first[(d, p)])
                        
                        dist_start = self._haversine_distance(self.locations[h], self.locations[p])
                        obj_travel_cost.append(dist_start * z_start)
                        
                        # Leg 2: Last POI -> Hotel
                        # Create z_end boolean
                        z_end = model.NewBoolVar(f'z_end_{f}_{d}_{h}_{p}')
                        model.AddBoolOr([x[(f, d, h)].Not(), is_last[(d, p)].Not(), z_end])
                        model.AddImplication(z_end, x[(f, d, h)])
                        model.AddImplication(z_end, is_last[(d, p)])
                        
                        dist_end = self._haversine_distance(self.locations[p], self.locations[h])
                        obj_travel_cost.append(dist_end * z_end)

        # Coherence (Families in different hotels)
        # For each day, for each pair of families, if they choose diff hotels -> penalty
        # Simplify: Maximize instances where x[f1, d, h] == x[f2, d, h]
        # Better: Penalty if Sum(x[f,d,h]) < len(families) ? No, that forces ALL.
        # Use Pairwise penalty.
        if len(families) > 1:
            for d in days:
                 for i in range(len(families)):
                     for j in range(i+1, len(families)):
                         f1 = families[i]
                         f2 = families[j]
                         # If they are NOT in the same hotel
                         # For each hotel h, if f1 in h and f2 NOT in h => mismatch
                         # Simplest: Bool `match_d`
                         # If match_d is 1, then x[f1,d,h] == x[f2,d,h] for all h.
                         pass # Skip complex linearization for now, focus on Switching

        # Switching Penalty (Hotel d != Hotel d+1)
        # Only feasible if hotel list is intersection.
        # If h is available on d and d+1:
        # if x[f,d,h] AND x[f,d+1,h] -> Continuity (Reward?)
        # Or Penalty if x[f,d,h] and NOT x[f,d+1,h]
        for f in families:
            for d in range(len(days) - 1):
                # Check intersection of hotels
                common_hotels = set(day_hotels[d]) & set(day_hotels[d+1])
                for h in common_hotels:
                    # continuity_var is true if stayed at h on d AND d+1
                    continuity = model.NewBoolVar(f'cont_{f}_{d}_{h}')
                    model.AddImplication(continuity, x[(f, d, h)])
                    model.AddImplication(continuity, x[(f, d+1, h)])
                    
                    # Reward continuity (negative penalty)
                    obj_switching.append(self.w_switching * continuity) # Negative weight * Bool = -200 reward? 
                    # Wait, w_switching is negative. So we want to ADD it to objective.
                    # Wait, minimizing switching means Maximizing Continuity.
                    # If I add (High Value * Continuity), I maximize continuity.
                    # My w_switching is -200. This is a PENALTY?
                    # "Penalty for switching" -> Cost. "Reward for continuity" -> Benefit.
                    # Let's say w_continuity = +500.
                    # obj_switching.append(500 * continuity)

        # --- Aggregate Objective ---
        # Maximize: 
        #   w_travel_dist * TotalDist (Negative)
        # + w_hotel_cost * TotalCost (Negative)
        # + ContinuityReward (Positive)
        
        # Scaling
        # Dist ~ 20-50 km per day. w=-1 -> -50.
        # Cost ~ 5000-10000. w=-0.01 -> -50 to -100.
        # Continuity. w=+1000? To prioritize sticking together.
        
        continuity_reward = 10000 # Strong bias to stay
        
        objective_expr = sum(obj_travel_cost) * self.w_travel_dist + \
                         sum(obj_hotel_cost) * self.w_hotel_cost
        
        # Add continuity rewards
        for term in obj_switching: # Actually these are currently empty, let's fix
             pass
             
        # Re-loop for Continuity Reward
        total_continuity = 0
        for f in families:
            for d in range(len(days) - 1):
                common_hotels = set(day_hotels[d]) & set(day_hotels[d+1])
                for h in common_hotels:
                    cont = model.NewBoolVar(f'stay_{f}_{d}_{h}')
                    model.AddImplication(cont, x[(f, d, h)])
                    model.AddImplication(cont, x[(f, d+1, h)])
                    # To force cont to be 1 if possible, we maximize it
                    total_continuity += cont
        
        objective_expr += total_continuity * continuity_reward
        
        model.Maximize(objective_expr)
        
        # --- Solve ---
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 10
        status = solver.Solve(model)
        
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            print(f"Solution Found! Status: {solver.StatusName(status)}")
            print(f"Objective Value: {solver.ObjectiveValue()}")
            result = self._extract_solution(solver, x, skeleton_order, is_first, is_last, families, days, day_hotels, day_skeleton)
            
            if output_file:
                with open(output_file, 'w') as f:
                    json.dump(result, f, indent=4)
                print(f"Saved optimized backbone to {output_file}")
                
            return result
        else:
            print("No solution found.")
            return None

    def _extract_solution(self, solver, x, skeleton_order, is_first, is_last, families, days, day_hotels, day_skeleton):
        result = {
            "hotel_assignments": {},
            "skeleton_routes": {}
        }
        
        # 1. Hotels
        for f in families:
            result["hotel_assignments"][f] = []
            for d in days:
                for h in day_hotels[d]:
                    if solver.Value(x[(f, d, h)]):
                        result["hotel_assignments"][f].append({
                            "day": d + 1,
                            "hotel_id": h,
                            "hotel_name": self.locations[h].name,
                            "cost": self.locations[h].cost
                        })
                        print(f"Family {f} Day {d+1}: {self.locations[h].name}")

        # 2. Routes (Graph Traversal)
        for d in days:
            pois = day_skeleton[d]
            if not pois: continue
            
            # Reconstruct path from is_first -> next -> next -> is_last
            # Find start
            start_node = None
            for p in pois:
                if solver.Value(is_first[(d, p)]):
                    start_node = p
                    break
            
            ordered_route = [start_node]
            current = start_node
            
            while len(ordered_route) < len(pois):
                for next_node in pois:
                    if next_node != current:
                        if solver.Value(skeleton_order.get((d, current, next_node), 0)):
                            ordered_route.append(next_node)
                            current = next_node
                            break
            
            result["skeleton_routes"][d + 1] = ordered_route
            print(f"Day {d+1} Optimzed Route: {ordered_route}")

        return result

# Runnable
if __name__ == "__main__":
    optimizer = HotelSkeletonOptimizer()
    solution = optimizer.optimize()
    
    if solution:
        with open("ml_or/data/optimized_backbone.json", 'w') as f:
            json.dump(solution, f, indent=4)
        print("Saved to ml_or/data/optimized_backbone.json")
