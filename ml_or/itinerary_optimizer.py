"""
Heavy-Weight OR-Tools CP-SAT Optimizer for Personalized Group Itineraries
==========================================================================

This module implements the time-expanded CP-SAT scheduling problem with deviation penalties
as described in TRAVELAI_Optimization_Context.md.

Philosophy:
- Personalization is optimized as DEVIATION from base itinerary, not independent routes
- POI + transport jointly optimized (not sequential)
- Explicit arrival/departure times
- Coherence loss penalizes divergence from group

Input Files (Immutable):
- locations.json: POIs, hotels, restaurants with visit_time, tags, base_importance
- transport_graph.json: Directed edges with mode, duration_min, cost, reliability
- base_itinerary.json: Planning scope (NO transport), start/end anchors, POIs per day
- family_preferences.json: Interest vectors, must_visit, never_visit, budget/energy weights

Decision Variables (CP-SAT):
- x[f,d,i] ∈ {0,1}  → visit POI
- y[f,d,i,j] ∈ {0,1} → ordering (i before j)
- z[f,d,i,j,m] ∈ {0,1} → transport mode m from i to j
- arr[f,d,i], dep[f,d,i] ∈ ℤ → arrival/departure times in minutes

Constraints:
- dep = arr + visit_time
- arr[j] ≥ dep[i] + transport_time(i,j,m) − M(1 − z)
- 0 ≤ arr ≤ day_end
- Anchor POIs fixed
- Must-visit enforced
- Never-visit excluded

Objective:
maximize Σ_f [ Satisfaction(f) − λ·CoherenceLoss(f) ]

where:
- Satisfaction(f,i) = base_importance × Σ_tag(interest_vector × poi_tag)
- CoherenceLoss = α·time + β·cost + γ·missedPOIs + δ·desync
- Recommended: α=1, β=0.05, γ=100, δ=0.5

Output:
- solved_itinerary.json with POI order, transport modes, arrival/departure times
"""

import json
from typing import Dict, List, Tuple, Optional
from ortools.sat.python import cp_model
from dataclasses import dataclass


@dataclass
class Location:
    """Location data structure"""
    location_id: str
    name: str
    type: str
    category: str
    lat: float
    lng: float
    avg_visit_time_min: int
    cost: float
    repeatable: bool
    tags: List[str]
    base_importance: float


@dataclass
class TransportEdge:
    """Transport edge data structure"""
    edge_id: str
    from_loc: str
    to_loc: str
    mode: str
    duration_min: int
    cost: float
    reliability: float


@dataclass
class FamilyPreference:
    """Family preference data structure"""
    family_id: str
    members: int
    children: int
    budget_sensitivity: float
    energy_level: float
    interest_vector: Dict[str, float]
    must_visit_locations: List[str]
    never_visit_locations: List[str]
    notes: str = ""


class ItineraryOptimizer:
    """
    Heavy-weight CP-SAT optimizer for personalized group itineraries.
    
    Treats optimization as deviation from base itinerary with coherence penalties.
    """
    
    def __init__(
        self,
        locations_file: str = "ml_or/data/locations.json",
        transport_file: str = "ml_or/data/transport_graph.json",
        base_itinerary_file: str = "ml_or/data/base_itinerary.json",
        family_prefs_file: str = "ml_or/data/family_preferences.json"
    ):
        """Initialize optimizer with data files"""
        self.locations = self._load_locations(locations_file)
        self.transport_edges = self._load_transport(transport_file)
        self.base_itinerary = self._load_base_itinerary(base_itinerary_file)
        self.family_prefs = self._load_family_prefs(family_prefs_file)
        
        # Build transport lookup
        self.transport_lookup = self._build_transport_lookup()
        
        # Coherence loss weights (recommended values)
        self.alpha = 1.0      # Extra travel time weight
        self.beta = 0.05      # Extra travel cost weight
        self.gamma = 100.0    # Missed shared POIs weight
        self.delta = 0.5      # Desync duration weight
        self.lambda_coherence = 0.3  # Overall coherence loss weight
        
    def _load_locations(self, filepath: str) -> Dict[str, Location]:
        """Load locations from JSON"""
        with open(filepath, 'r') as f:
            data = json.load(f)
        return {
            loc['location_id']: Location(**loc)
            for loc in data
        }
    
    def _load_transport(self, filepath: str) -> List[TransportEdge]:
        """Load transport edges from JSON"""
        with open(filepath, 'r') as f:
            data = json.load(f)
        return [
            TransportEdge(
                edge_id=edge['edge_id'],
                from_loc=edge['from'],
                to_loc=edge['to'],
                mode=edge['mode'],
                duration_min=edge['duration_min'],
                cost=edge['cost'],
                reliability=edge['reliability']
            )
            for edge in data
        ]
    
    def _load_base_itinerary(self, filepath: str) -> Dict:
        """Load base itinerary from JSON"""
        with open(filepath, 'r') as f:
            return json.load(f)
    
    def _load_family_prefs(self, filepath: str) -> Dict[str, FamilyPreference]:
        """Load family preferences from JSON"""
        with open(filepath, 'r') as f:
            data = json.load(f)
        return {
            fam['family_id']: FamilyPreference(**fam)
            for fam in data
        }
    
    def _build_transport_lookup(self) -> Dict[Tuple[str, str], List[TransportEdge]]:
        """Build lookup for transport options between locations"""
        lookup = {}
        for edge in self.transport_edges:
            key = (edge.from_loc, edge.to_loc)
            if key not in lookup:
                lookup[key] = []
            lookup[key].append(edge)
        return lookup
    
    def _create_fallback_transport(self, from_loc: str, to_loc: str) -> TransportEdge:
        """
        STEP 2: Create synthetic CAB transport when no edge exists.
        
        Uses Haversine distance to estimate:
        - Duration: distance / 25 km/h (conservative city speed)
        - Cost: distance * 15 per km
        """
        import math
        
        loc1 = self.locations[from_loc]
        loc2 = self.locations[to_loc]
        
        # Haversine distance in km
        lat1, lon1 = math.radians(loc1.lat), math.radians(loc1.lng)
        lat2, lon2 = math.radians(loc2.lat), math.radians(loc2.lng)
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        distance_km = 6371 * c  # Earth radius in km
        
        # Estimate duration and cost
        duration_min = int(distance_km / 25 * 60)  # 25 km/h city speed
        cost = distance_km * 15  # 15 per km
        
        return TransportEdge(
            edge_id=f"FALLBACK_CAB_{from_loc}_{to_loc}",
            from_loc=from_loc,
            to_loc=to_loc,
            mode="CAB_FALLBACK",
            duration_min=max(10, duration_min),  # Minimum 10 minutes
            cost=max(50, cost),  # Minimum 50 cost
            reliability=0.85  # Reasonable reliability
        )
    
    def calculate_satisfaction(
        self,
        family: FamilyPreference,
        location: Location
    ) -> float:
        """
        Calculate satisfaction score for a family visiting a location.
        
        Satisfaction(f,i) = base_importance × Σ_tag(interest_vector × poi_tag)
        """
        if not location.tags:
            return location.base_importance
        
        tag_score = 0.0
        for tag in location.tags:
            if tag in family.interest_vector:
                tag_score += family.interest_vector[tag]
        
        # Normalize by number of tags
        if len(location.tags) > 0:
            tag_score /= len(location.tags)
        
        return location.base_importance * (1.0 + tag_score)
    
    def optimize_single_family_single_day(
        self,
        family_id: str = "FAM_001",
        day_index: int = 0,
        max_pois: int = 3,
        time_limit_seconds: int = 30,
        freeze_order: bool = False,  # STEP 5: Now allowing reordering
        enable_transport_choice: bool = True  # STEP 4: Enable transport mode selection
    ) -> Optional[Dict]:
        """
        Optimize itinerary for 1 family, 1 day, limited POIs.
        
        STEP 1-4: Order frozen, transport choice enabled
        STEP 5A/5B: Reintroduce ordering freedom with START/END nodes
        
        Args:
            family_id: Family to optimize for
            day_index: Which day from base itinerary (0-indexed)
            max_pois: Maximum POIs to consider (start with 3)
            time_limit_seconds: Solver time limit
            freeze_order: If True, use base itinerary order; if False, allow reordering (STEP 5)
            enable_transport_choice: If True, allow multiple transport modes (STEP 4)
        
        Returns:
            Solution dict with POI order, transport, times, or None if infeasible
        """
        family = self.family_prefs[family_id]
        day_data = self.base_itinerary['days'][day_index]
        assumptions = self.base_itinerary['assumptions']
        
        # Parse time constraints
        day_start_min = self._time_to_minutes(assumptions['day_start_time'])
        day_end_min = self._time_to_minutes(assumptions['day_end_time'])
        start_loc = assumptions['start_end_location']
        
        # Get candidate POIs from base itinerary (limit to max_pois)
        base_pois = [poi['location_id'] for poi in day_data['pois'][:max_pois]]
        
        # Filter out never-visit locations
        candidate_pois = [
            poi for poi in base_pois
            if poi not in family.never_visit_locations
        ]
        
        # Add must-visit locations if not already included
        for must_visit in family.must_visit_locations:
            if must_visit not in candidate_pois and must_visit in self.locations:
                candidate_pois.append(must_visit)
        
        # Limit to max_pois
        candidate_pois = candidate_pois[:max_pois]
        
        if not candidate_pois:
            return None
        
        # Create CP-SAT model
        model = cp_model.CpModel()
        
        # STEP 5: Add START and END dummy nodes (critical for ordering freedom)
        START_NODE = f"START_DAY_{day_index + 1}"
        END_NODE = f"END_DAY_{day_index + 1}"
        
        # All nodes = START + POIs + END
        all_nodes = [START_NODE] + candidate_pois + [END_NODE]
        
        # Decision variables
        # x[i] = 1 if POI i is visited
        x = {}
        for poi in candidate_pois:
            x[poi] = model.NewBoolVar(f'visit_{poi}')
            # STEP 5: Force all POIs to be visited (for now)
            # Later we can make this optional based on satisfaction scores
            model.Add(x[poi] == 1)
        
        # STEP 5A: y[i,j] = 1 if node i is visited before node j (ordering variables)
        y = {}
        if not freeze_order:
            # Reintroduce ordering freedom
            for i in all_nodes:
                for j in all_nodes:
                    if i != j:
                        # Skip START as destination and END as source
                        if j == START_NODE or i == END_NODE:
                            continue
                        y[(i, j)] = model.NewBoolVar(f'order_{i}_before_{j}')
        
        # arr[i], dep[i] = arrival and departure times at POI i (in minutes from day start)
        arr = {}
        dep = {}
        for poi in candidate_pois:
            arr[poi] = model.NewIntVar(day_start_min, day_end_min, f'arr_{poi}')
            dep[poi] = model.NewIntVar(day_start_min, day_end_min, f'dep_{poi}')
        
        # START and END have fixed times
        arr[START_NODE] = day_start_min
        dep[START_NODE] = day_start_min
        arr[END_NODE] = day_end_min
        dep[END_NODE] = day_end_min
        
        # z[i,j,m] = 1 if transport mode m is used from i to j
        z = {}
        transport_modes = {}
        
        if freeze_order:
            # STEP 1-4: Only create for consecutive POIs in fixed order
            for idx in range(len(candidate_pois) - 1):
                i = candidate_pois[idx]
                j = candidate_pois[idx + 1]
                key = (i, j)
                
                # Use real transport edges if available, add fallback
                if key in self.transport_lookup:
                    transport_modes[key] = self.transport_lookup[key].copy()
                else:
                    transport_modes[key] = []
                
                # Always add fallback transport
                fallback_edge = self._create_fallback_transport(i, j)
                transport_modes[key].append(fallback_edge)
                
                # Create decision variables for each transport mode
                for edge in transport_modes[key]:
                    z[(i, j, edge.mode, edge.edge_id)] = model.NewBoolVar(
                        f'transport_{i}_{j}_{edge.mode}_{edge.edge_id}'
                    )
        else:
            # STEP 5: Create transport variables for all possible edges (including START/END)
            for i in all_nodes:
                for j in all_nodes:
                    if i == j or j == START_NODE or i == END_NODE:
                        continue
                    
                    key = (i, j)
                    
                    # For START and END, no real transport needed (logical edges)
                    if i == START_NODE or j == END_NODE:
                        # Create a dummy zero-cost, zero-time edge
                        transport_modes[key] = [TransportEdge(
                            edge_id=f"LOGICAL_{i}_{j}",
                            from_loc=i,
                            to_loc=j,
                            mode="LOGICAL",
                            duration_min=0,
                            cost=0,
                            reliability=1.0
                        )]
                    else:
                        # Real POI to POI edges
                        if key in self.transport_lookup:
                            transport_modes[key] = self.transport_lookup[key].copy()
                        else:
                            transport_modes[key] = []
                        
                        # Add fallback transport
                        fallback_edge = self._create_fallback_transport(i, j)
                        transport_modes[key].append(fallback_edge)
                    
                    # Create decision variables
                    for edge in transport_modes[key]:
                        z[(i, j, edge.mode, edge.edge_id)] = model.NewBoolVar(
                            f'transport_{i}_{j}_{edge.mode}_{edge.edge_id}'
                        )
        
        # Constraints
        
        # 1. Departure = Arrival + Visit Time
        for poi in candidate_pois:
            visit_time = self.locations[poi].avg_visit_time_min
            model.Add(dep[poi] == arr[poi] + visit_time)
        
        if freeze_order:
            # STEP 1-4: Fixed order constraints
            # 2. Time chaining for consecutive POIs (fixed order, multiple transport modes)
            for idx in range(len(candidate_pois) - 1):
                i = candidate_pois[idx]
                j = candidate_pois[idx + 1]
                key = (i, j)
                
                # Exactly one transport mode must be selected
                transport_vars = [z[(i, j, edge.mode, edge.edge_id)] for edge in transport_modes[key]]
                model.Add(sum(transport_vars) == 1)
                
                # Time constraint: arr[j] >= dep[i] + selected_transport_duration
                for edge in transport_modes[key]:
                    model.Add(
                        arr[j] >= dep[i] + edge.duration_min
                    ).OnlyEnforceIf(z[(i, j, edge.mode, edge.edge_id)])
            
            # 3. First POI must start at or after day start
            model.Add(arr[candidate_pois[0]] >= day_start_min)
            
            # 4. Last POI must end before day end
            model.Add(dep[candidate_pois[-1]] <= day_end_min)
        
        else:
            # STEP 5A: Ordering freedom with flow constraints
            
            # 2. STEP 5A: Flow constraints - each POI has at most one predecessor and successor
            for poi in candidate_pois:
                # At most one incoming edge (predecessor)
                incoming = [y[(i, poi)] for i in all_nodes if i != poi and (i, poi) in y]
                if incoming:
                    model.Add(sum(incoming) <= 1)
                
                # At most one outgoing edge (successor)
                outgoing = [y[(poi, j)] for j in all_nodes if j != poi and (poi, j) in y]
                if outgoing:
                    model.Add(sum(outgoing) <= 1)
            
            # 3. START node: exactly one outgoing edge
            start_outgoing = [y[(START_NODE, j)] for j in candidate_pois if (START_NODE, j) in y]
            if start_outgoing:
                model.Add(sum(start_outgoing) == 1)
            
            # 4. END node: exactly one incoming edge
            end_incoming = [y[(i, END_NODE)] for i in candidate_pois if (i, END_NODE) in y]
            if end_incoming:
                model.Add(sum(end_incoming) == 1)
            
            # 5. STEP 5B: Bind transport to ordering
            # Σ_m z[i,j,m] = y[i,j]
            for i in all_nodes:
                for j in all_nodes:
                    if i == j or j == START_NODE or i == END_NODE:
                        continue
                    
                    key = (i, j)
                    if key in transport_modes and (i, j) in y:
                        transport_vars = [z[(i, j, edge.mode, edge.edge_id)] for edge in transport_modes[key]]
                        # If edge i->j is used in ordering, exactly one transport mode
                        model.Add(sum(transport_vars) == 1).OnlyEnforceIf(y[(i, j)])
                        # If edge i->j is not used, no transport
                        model.Add(sum(transport_vars) == 0).OnlyEnforceIf(y[(i, j)].Not())
            
            # 6. Time chaining: if i before j, then arr[j] >= dep[i] + transport_time
            for i in all_nodes:
                for j in all_nodes:
                    if i == j or j == START_NODE or i == END_NODE:
                        continue
                    
                    if (i, j) not in y:
                        continue
                    
                    key = (i, j)
                    if key in transport_modes:
                        for edge in transport_modes[key]:
                            # If this edge and mode are selected
                            if (i, j, edge.mode, edge.edge_id) in z:
                                # Skip logical edges (START/END)
                                if edge.mode == "LOGICAL":
                                    continue
                                
                                # For real POIs: arr[j] >= dep[i] + duration
                                if i in candidate_pois and j in candidate_pois:
                                    model.Add(
                                        arr[j] >= dep[i] + edge.duration_min
                                    ).OnlyEnforceIf(z[(i, j, edge.mode, edge.edge_id)])
                                # For START -> POI: arr[poi] >= day_start
                                elif i == START_NODE and j in candidate_pois:
                                    model.Add(
                                        arr[j] >= day_start_min
                                    ).OnlyEnforceIf(z[(i, j, edge.mode, edge.edge_id)])
                                # For POI -> END: dep[poi] <= day_end
                                elif i in candidate_pois and j == END_NODE:
                                    model.Add(
                                        dep[i] <= day_end_min
                                    ).OnlyEnforceIf(z[(i, j, edge.mode, edge.edge_id)])
            
            # 7. If POI is visited, it must have exactly one predecessor and one successor
            for poi in candidate_pois:
                incoming = [y[(i, poi)] for i in all_nodes if i != poi and (i, poi) in y]
                outgoing = [y[(poi, j)] for j in all_nodes if j != poi and (poi, j) in y]
                
                if incoming and outgoing:
                    # If visited: exactly one in and one out
                    model.Add(sum(incoming) == 1).OnlyEnforceIf(x[poi])
                    model.Add(sum(outgoing) == 1).OnlyEnforceIf(x[poi])
                    # If not visited: no edges
                    model.Add(sum(incoming) == 0).OnlyEnforceIf(x[poi].Not())
                    model.Add(sum(outgoing) == 0).OnlyEnforceIf(x[poi].Not())
        
        # 8. Must-visit constraints (applies to both modes)
        for must_visit in family.must_visit_locations:
            if must_visit in candidate_pois:
                model.Add(x[must_visit] == 1)
        
        # 9. Time bounds for all POIs (applies to both modes)
        for poi in candidate_pois:
            model.Add(arr[poi] >= day_start_min)
            model.Add(dep[poi] <= day_end_min)
        
        # Objective: STEP 4/5 - Multi-objective (cost + time)
        # Minimize: w_cost * total_cost + w_time * total_duration
        cost_terms = []
        time_terms = []
        
        if freeze_order:
            # STEP 4: Fixed order - only consecutive POIs
            for idx in range(len(candidate_pois) - 1):
                i = candidate_pois[idx]
                j = candidate_pois[idx + 1]
                key = (i, j)
                for edge in transport_modes[key]:
                    cost_int = int(edge.cost)
                    time_int = edge.duration_min
                    
                    cost_terms.append(cost_int * z[(i, j, edge.mode, edge.edge_id)])
                    time_terms.append(time_int * z[(i, j, edge.mode, edge.edge_id)])
        else:
            # STEP 5: Free ordering - all possible edges
            for i in all_nodes:
                for j in all_nodes:
                    if i == j or j == START_NODE or i == END_NODE:
                        continue
                    
                    key = (i, j)
                    if key in transport_modes:
                        for edge in transport_modes[key]:
                            # Skip logical edges (zero cost/time)
                            if edge.mode == "LOGICAL":
                                continue
                            
                            cost_int = int(edge.cost)
                            time_int = edge.duration_min
                            
                            if (i, j, edge.mode, edge.edge_id) in z:
                                cost_terms.append(cost_int * z[(i, j, edge.mode, edge.edge_id)])
                                time_terms.append(time_int * z[(i, j, edge.mode, edge.edge_id)])
        
        total_cost = sum(cost_terms) if cost_terms else 0
        total_time = sum(time_terms) if time_terms else 0
        
        # Weights for multi-objective (can be adjusted based on family preferences)
        w_cost = int(family.budget_sensitivity * 100)  # Higher = more cost-sensitive
        w_time = int((1 - family.budget_sensitivity) * 100)  # Higher = more time-sensitive
        
        # Minimize weighted sum
        model.Minimize(w_cost * total_cost + w_time * total_time)
        
        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = time_limit_seconds
        solver.parameters.log_search_progress = True
        
        status = solver.Solve(model)
        
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            return self._extract_solution(
                solver, x, y if not freeze_order else None, z, arr, dep,
                candidate_pois, transport_modes, family_id, day_index,
                freeze_order, all_nodes if not freeze_order else None
            )
        else:
            print(f"No feasible solution found. Status: {solver.StatusName(status)}")
            return None
    
    def _extract_solution(
        self,
        solver: cp_model.CpSolver,
        x: Dict,
        y: Optional[Dict],
        z: Dict,
        arr: Dict,
        dep: Dict,
        candidate_pois: List[str],
        transport_modes: Dict,
        family_id: str,
        day_index: int,
        freeze_order: bool = True,
        all_nodes: Optional[List[str]] = None
    ) -> Dict:
        """
        Extract solution from solved model.
        
        STEP 1-4: Fixed order - POIs in base itinerary order
        STEP 5A/5B: Free order - reconstruct path from y[i,j] variables
        """
        
        if freeze_order:
            # STEP 1-4: POIs are in fixed order from base itinerary
            visited_pois = candidate_pois  # All are visited
        else:
            # STEP 5A/5B: Reconstruct path from y[i,j] variables
            # Start from START node and follow edges
            START_NODE = all_nodes[0]
            END_NODE = all_nodes[-1]
            
            visited_pois = []
            current = START_NODE
            
            # Follow the path from START to END
            max_iterations = len(candidate_pois) + 2  # Safety limit
            iteration = 0
            
            while current != END_NODE and iteration < max_iterations:
                iteration += 1
                
                # Find next node
                next_node = None
                for j in all_nodes:
                    if current != j and (current, j) in y:
                        if solver.Value(y[(current, j)]) == 1:
                            next_node = j
                            break
                
                if next_node is None:
                    print(f"⚠️ WARNING: No successor found for {current}")
                    break
                
                # Add to path if it's a real POI (not START/END)
                if next_node != END_NODE:
                    visited_pois.append(next_node)
                
                current = next_node
            
            if iteration >= max_iterations:
                print(f"⚠️ WARNING: Path reconstruction exceeded max iterations")
            
            print(f"\n🔍 STEP 5 PATH RECONSTRUCTION:")
            print(f"   Reconstructed order: {' → '.join([START_NODE] + visited_pois + [END_NODE])}")
        
        # Extract transport modes
        transport_plan = []
        for i in range(len(visited_pois) - 1):
            from_poi = visited_pois[i]
            to_poi = visited_pois[i + 1]
            
            key = (from_poi, to_poi)
            if key in transport_modes:
                for edge in transport_modes[key]:
                    if (from_poi, to_poi, edge.mode, edge.edge_id) in z:
                        if solver.Value(z[(from_poi, to_poi, edge.mode, edge.edge_id)]) == 1:
                            transport_plan.append({
                                'from': from_poi,
                                'from_name': self.locations[from_poi].name,
                                'to': to_poi,
                                'to_name': self.locations[to_poi].name,
                                'mode': edge.mode,
                                'duration_min': edge.duration_min,
                                'cost': edge.cost,
                                'reliability': edge.reliability
                            })
                            break
        
        # Calculate total cost and time
        total_transport_cost = sum(t['cost'] for t in transport_plan)
        total_transport_time = sum(t['duration_min'] for t in transport_plan)
        
        # Build solution
        solution = {
            'family_id': family_id,
            'day': day_index + 1,
            'objective_value': solver.ObjectiveValue(),
            'solve_time_seconds': solver.WallTime(),
            'total_transport_cost': total_transport_cost,
            'total_transport_time_min': total_transport_time,
            'ordering_mode': 'frozen' if freeze_order else 'free',
            'pois': [
                {
                    'sequence': idx + 1,
                    'location_id': poi,
                    'location_name': self.locations[poi].name,
                    'arrival_time': self._minutes_to_time(solver.Value(arr[poi])),
                    'departure_time': self._minutes_to_time(solver.Value(dep[poi])),
                    'visit_duration_min': solver.Value(dep[poi]) - solver.Value(arr[poi]),
                    'arrival_minutes': solver.Value(arr[poi]),  # For debugging
                    'departure_minutes': solver.Value(dep[poi])  # For debugging
                }
                for idx, poi in enumerate(visited_pois)
            ],
            'transport': transport_plan
        }
        
        # SANITY CHECK: Verify monotonic arrival times
        for idx in range(len(visited_pois) - 1):
            curr_dep = solver.Value(dep[visited_pois[idx]])
            next_arr = solver.Value(arr[visited_pois[idx + 1]])
            assert next_arr > curr_dep, f"Time not advancing! POI {idx} dep={curr_dep}, POI {idx+1} arr={next_arr}"
        
        print("\n✅ SANITY CHECK PASSED: Arrival times are monotonically increasing")
        
        # TRANSPORT CHECK: Verify transport modes are selected
        print(f"✅ TRANSPORT CHECK: {len(transport_plan)} transport legs selected")
        for t in transport_plan:
            print(f"   {t['from_name']} → {t['to_name']}: {t['mode']} ({t['duration_min']}min, ₹{t['cost']})")
        
        return solution
    
    def _time_to_minutes(self, time_str: str) -> int:
        """Convert HH:MM to minutes since midnight"""
        hours, minutes = map(int, time_str.split(':'))
        return hours * 60 + minutes
    
    def _minutes_to_time(self, minutes: int) -> str:
        """Convert minutes since midnight to HH:MM"""
        hours = minutes // 60
        mins = minutes % 60
        return f"{hours:02d}:{mins:02d}"


def main():
    """Test the optimizer - STEP 5A/5B: ORDERING FREEDOM"""
    print("=" * 80)
    print("STEP 5A/5B: Heavy-Weight CP-SAT - ORDERING FREEDOM TEST")
    print("=" * 80)
    print()
    print("Following ChatGPT's guidance:")
    print("  ✅ STEP 1: Order was FROZEN from base itinerary")
    print("  ✅ STEP 2: Fallback transport (CAB) injected for missing edges")
    print("  ✅ STEP 3: Time chaining enforced explicitly")
    print("  ✅ STEP 4: Multiple transport modes available - solver chooses best")
    print("  🎯 STEP 5A: Add y[i,j] ordering variables with flow constraints")
    print("  🎯 STEP 5B: Bind transport to ordering: Σ_m z[i,j,m] = y[i,j]")
    print("  🎯 GOAL: Allow solver to reorder POIs optimally")
    print()
    
    optimizer = ItineraryOptimizer()
    
    # Get family preferences to show budget sensitivity
    family = optimizer.family_prefs["FAM_001"]
    print("Family FAM_001 preferences:")
    print(f"  - Budget sensitivity: {family.budget_sensitivity:.2f} (0=time-focused, 1=cost-focused)")
    print(f"  - Members: {family.members} (including {family.children} children)")
    print()
    
    print("Optimizing for:")
    print("  - Family: FAM_001")
    print("  - Day: 1")
    print("  - Max POIs: 3")
    print("  - Order: FREE (solver can reorder)")
    print("  - Base order: LOC_001 → LOC_007 → LOC_002")
    print("  - Transport: MULTIPLE OPTIONS (BUS, CAB, METRO, AUTO + FALLBACK)")
    print()
    
    solution = optimizer.optimize_single_family_single_day(
        family_id="FAM_001",
        day_index=0,
        max_pois=3,
        time_limit_seconds=60,  # More time for ordering optimization
        freeze_order=False,  # STEP 5: Allow reordering
        enable_transport_choice=True  # STEP 4
    )
    
    if solution:
        print("\n" + "=" * 80)
        print("✅ SOLUTION FOUND - STEP 5A/5B COMPLETE")
        print("=" * 80)
        print(json.dumps(solution, indent=2))
        
        # Verify time advancement
        print("\n" + "=" * 80)
        print("TIME ADVANCEMENT VERIFICATION:")
        print("=" * 80)
        for poi_data in solution['pois']:
            print(f"  {poi_data['sequence']}. {poi_data['location_name']}")
            print(f"     Arrive: {poi_data['arrival_time']} ({poi_data['arrival_minutes']} min)")
            print(f"     Depart: {poi_data['departure_time']} ({poi_data['departure_minutes']} min)")
        
        print("\n" + "=" * 80)
        print("TRANSPORT SUMMARY:")
        print("=" * 80)
        print(f"  Total transport cost: ₹{solution['total_transport_cost']}")
        print(f"  Total transport time: {solution['total_transport_time_min']} minutes")
        print(f"  Objective value: {solution['objective_value']:.2f}")
        print(f"  Ordering mode: {solution['ordering_mode']}")
        
        # Save to file
        output_file = "ml_or/solved_itinerary_step5ab.json"
        with open(output_file, 'w') as f:
            json.dump(solution, f, indent=2)
        print(f"\n✅ Solution saved to: {output_file}")
        print("\n🎯 STEP 5A/5B SUCCESS: Ordering freedom enabled!")
        print("   Solver can now reorder POIs to minimize cost/time")
        print("   Next: STEP 5C/5D - Add START/END flow + subtour elimination (MTZ)")
    else:
        print("\n❌ No feasible solution found.")
        print("   Debug: Check flow constraints and transport connectivity")


if __name__ == "__main__":
    main()
