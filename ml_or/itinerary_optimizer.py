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
    role: str = "SKELETON"  # SKELETON (shared order) or BRANCH (optional per family)


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
    pace_preference: str = "moderate"
    notes: str = ""


class ItineraryOptimizer:
    """
    Heavy-weight CP-SAT optimizer for personalized group itineraries.
    
    Treats optimization as deviation from base itinerary with coherence penalties.
    """
    
    def __init__(
        self,
        locations_file: str = "ml_or/data/locations.json",
        hotels_file: str = "ml_or/data/hotels.json",
        transport_file: str = "ml_or/data/transport_graph.json",
        base_itinerary_file: str = "ml_or/data/base_itinerary.json",
        family_prefs_file: str = "ml_or/data/family_preferences.json",
        optimized_backbone_file: str = "ml_or/data/optimized_backbone.json" # NEW Input
    ):
        """Initialize optimizer with data files"""
        self.locations = self._load_locations(locations_file, hotels_file)
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
        
        # DECISION TRACE COLLECTOR (Non-LLM Authority Layer)
        self.decision_traces = {}  # Key: f"{day_index}" -> Trace Dict

        # Load Hotel & Backbone & Restaurants
        self.hotel_assignments, self.backbone_routes, self.daily_restaurants = self._load_backbone(optimized_backbone_file)
        
        # Inject Restaurants into Base Itinerary
        self._inject_restaurants()

    def _load_backbone(self, filepath: str) -> Tuple[Dict, Dict, Dict]:
        """Load optimized hotel assignments, skeleton routes, and restaurants"""
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
                return (
                    data.get("hotel_assignments", {}), 
                    data.get("skeleton_routes", {}),
                    data.get("daily_restaurants", {})
                )
        except FileNotFoundError:
            print("Warning: Optimized backbone file not found. Using defaults/empty.")
            return {}, {}, {}
        
    def _load_locations(self, locations_file: str, hotels_file: str) -> Dict[str, Location]:
        """Load locations and hotels from JSON"""
        with open(locations_file, 'r') as f:
            data = json.load(f)
            
        try:
            with open(hotels_file, 'r') as f:
                hotels_data = json.load(f)
                data.extend(hotels_data)
        except Exception as e:
            print(f"Warning: Could not load hotels from {hotels_file}: {e}")
            
        return {
            loc['location_id']: Location(**loc)
            for loc in data
        }
    
    def _load_transport(self, filepath: str) -> List[TransportEdge]:
        """Load transport edges, filtering out unavailable ones"""
        with open(filepath, 'r') as f:
            all_edges = json.load(f)
        
        # Filter by availability (supports transport disruptions)
        available_edges = [
            edge for edge in all_edges
            if edge.get('available', True)  # Default to True for backward compatibility
        ]
        
        filtered_count = len(all_edges) - len(available_edges)
        if filtered_count > 0:
            print(f"  [DISRUPTION] Filtered {filtered_count} unavailable transport edges")
        
        
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
            for edge in available_edges  # ← Use filtered edges
        ]
    
    def _load_base_itinerary(self, filepath: str) -> Dict:
        """Load base itinerary from JSON"""
        with open(filepath, 'r') as f:
            return json.load(f)

    def _inject_restaurants(self):
        """Inject optimized restaurants into the base itinerary."""
        if not self.daily_restaurants:
            return

        print("  [INJECTION] Injecting optimized restaurants into base itinerary...")
        for day_data in self.base_itinerary['days']:
            day_num = str(day_data['day']) # JSON keys are strings
            if day_num in self.daily_restaurants:
                rest_data = self.daily_restaurants[day_num]
                
                # Check if we need to remove placeholders
                original_count = len(day_data['pois'])
                # Remove ANY POI that looks like a placeholder
                day_data['pois'] = [
                    p for p in day_data['pois'] 
                    if p['location_id'] not in ["LOC_LUNCH", "LOC_DINNER"]
                    and "LUNCH" not in p['location_id'] # Safety for other variants
                    and "DINNER" not in p['location_id']
                ]
                if len(day_data['pois']) < original_count:
                    print(f"    Day {day_num}: Removed {original_count - len(day_data['pois'])} placeholder(s)")
                
                # Lunch Skipped (User Request)
                # if "lunch" in rest_data: ...
                
                # Add Dinner
                if "dinner" in rest_data:
                    original_id = rest_data["dinner"]
                    virtual_id = f"{original_id}_DINNER"
                    
                    # Create Virtual Location in self.locations
                    if original_id in self.locations:
                         import copy
                         orig_loc = self.locations[original_id]
                         new_loc = copy.deepcopy(orig_loc)
                         new_loc.location_id = virtual_id
                         new_loc.name = f"{orig_loc.name} (Dinner)"
                         self.locations[virtual_id] = new_loc

                         day_data['pois'].append({
                            "location_id": virtual_id,
                            "role": "SKELETON",
                            "planned_visit_time_min": 90,
                            "time_window_start": "20:00",
                            "time_window_end": "21:30",
                            "comment": "Optimized Dinner"
                        })
                         print(f"    Day {day_num}: Added Dinner ({virtual_id})")
                    else:
                        print(f"    Day {day_num}: Warning - Dinner ID {original_id} not found in locations")
    
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
    
    
    def _haversine_distance(self, loc1: Location, loc2: Location) -> float:
        """Calculate Haversine distance in km between two locations"""
        import math
        
        lat1, lon1 = math.radians(loc1.lat), math.radians(loc1.lng)
        lat2, lon2 = math.radians(loc2.lat), math.radians(loc2.lng)
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        return 6371 * c  # Earth radius in km

    def _create_fallback_transport(self, from_loc: str, to_loc: str) -> TransportEdge:
        """
        STEP 2: Create synthetic CAB transport when no edge exists.
        
        Uses Haversine distance to estimate:
        - Duration: distance / 25 km/h (conservative city speed)
        - Cost: distance * 15 per km
        """
        loc1 = self.locations[from_loc]
        loc2 = self.locations[to_loc]
        
        distance_km = self._haversine_distance(loc1, loc2)
        
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
            
    def expand_branch_pois_for_day(
        self,
        day_index: int,
        family_ids: List[str],
        skeleton_filter: List[str],
        base_pois_filter: List[str],
        max_total_branch: int = 5,
        radius_km: float = 5.0
    ) -> List[str]:
        """
        STEP 15: Dynamically find candidate Branch POIs from locations.json
        
        Logic:
        1. Calculate centroid of Skeleton POIs
        2. Filter locations within radius_km
        3. Score by family interests
        4. Return top unique candidates
        """
        if not skeleton_filter:
            return []
            
        # 1. Calculate Skeleton Centroid
        lat_sum = 0.0
        lng_sum = 0.0
        for poi in skeleton_filter:
            loc = self.locations[poi]
            lat_sum += loc.lat
            lng_sum += loc.lng
            
        center_lat = lat_sum / len(skeleton_filter)
        center_lng = lng_sum / len(skeleton_filter)
        
        # Dummy location for center
        center_loc = Location(
            location_id="CENTER", name="Center", type="DUMMY", category="DUMMY",
            lat=center_lat, lng=center_lng, avg_visit_time_min=0, cost=0,
            repeatable=False, tags=[], base_importance=0, role="DUMMY"
        )
        
        candidates = []
        
        # 2 & 3. Scan all locations
        for loc_id, loc in self.locations.items():
            # Skip placeholders
            if loc_id in ["LOC_LUNCH", "LOC_DINNER", "CENTER"]:
                continue
            
            # Skip if already in base plan
            if loc_id in base_pois_filter:
                continue
            
            # Skip disallowed types/categories if needed (optional)
            if loc.category == "HOTEL": 
                continue
            
            # Restaurants are exclusively for Dinner
            if loc.type == "RESTAURANT":
                continue
                
            # Geo Filter
            dist = self._haversine_distance(center_loc, loc)
            if dist > radius_km:
                continue
                
            # Preference Scoring
            max_score = 0.0
            
            for fid in family_ids:
                fam = self.family_prefs[fid]
                if loc_id in fam.never_visit_locations:
                    max_score = -1
                    break
                
                score = self.calculate_satisfaction(fam, loc)
                if score > max_score:
                    max_score = score
            
            if max_score > 0:
                candidates.append((loc_id, max_score))
        
        # 4. Rank and Cap
        candidates.sort(key=lambda x: x[1], reverse=True)
        
        # Take top N uniquely
        final_list = [c[0] for c in candidates[:max_total_branch]]
        
        print(f"[EXPANSION] Found {len(final_list)} extra candidates near Skeleton centroid ({center_lat:.4f}, {center_lng:.4f})")
        if final_list:
            print(f"            Ids: {final_list}")
            
        return final_list
    
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
        
        # STEP 16 LOGIC MOVED TO MULTI-FAMILY METHOD
        # (This block was misplaced and is now removed)
        
        # Objective: STEP 8 PART A - Satisfaction - Coherence Loss (with proper scaling)
        # maximize Σ_f [ Satisfaction(f) − λ·CoherenceLoss(f) ]
        
        # STEP 7: Calculate satisfaction scores for each POI
        # Since all POIs are forced to be visited (x[poi] == 1), we can calculate total satisfaction
        total_satisfaction_value = 0.0
        for poi in candidate_pois:
            sat_score = self.calculate_satisfaction(family, self.locations[poi])
            total_satisfaction_value += sat_score
        
        # Scale satisfaction to integer (multiply by 100 for human-readable scale)
        # Satisfaction ≈ O(1-10), so scaled ≈ O(100-1000)
        satisfaction_scaled = int(total_satisfaction_value * 100)
        
        # STEP 8: Calculate coherence loss components
        # Component 1: Transport cost and time
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
        
        # Component 2: Order deviation penalty (STEP 8 - NEW)
        # Penalize deviations from base itinerary order
        order_deviation_terms = []
        
        if not freeze_order and len(candidate_pois) > 1:
            # Build base order map: base_order[poi] = position (0, 1, 2, ...)
            base_order = {poi: idx for idx, poi in enumerate(candidate_pois)}
            
            # For each edge in the solution, check if it violates base order
            for i in candidate_pois:
                for j in candidate_pois:
                    if i != j and (i, j) in y:
                        # If i comes before j in base order, no penalty
                        # If i comes after j in base order, add penalty
                        if base_order[i] > base_order[j]:
                            # This edge violates base order
                            # Penalty = 100 per violation (scaled to match satisfaction)
                            order_deviation_terms.append(100 * y[(i, j)])
        
        total_order_deviation = sum(order_deviation_terms) if order_deviation_terms else 0
        
        # Coherence loss = α·time + β·cost + γ·order_deviation
        # Rescaled to match satisfaction magnitude (O(100-1000))
        # Original: α=1, β=0.05, γ=100
        # Scaled: divide time and cost by 10 to bring to O(1-10) range
        alpha = 1      # Time weight (1 minute ≈ 1 satisfaction point)
        beta = 1       # Cost weight (₹1 ≈ 1 satisfaction point)
        gamma = 1      # Order deviation weight (1 violation ≈ 100 satisfaction points, already scaled)
        
        coherence_loss = alpha * total_time + beta * total_cost + gamma * total_order_deviation
        
        # Overall objective: maximize satisfaction - λ·coherence_loss
        # λ (lambda_coherence) controls tradeoff between satisfaction and coherence
        # For single family: λ = 0.3 (coherence is 30% as important as satisfaction)
        lambda_coherence = 0.3
        lambda_coherence_scaled = int(lambda_coherence * 100)  # Scale to match satisfaction
        
        # Maximize: satisfaction - λ·coherence_loss
        # Now both terms are in O(100-1000) range
        objective = satisfaction_scaled - lambda_coherence_scaled * coherence_loss
        
        model.Maximize(objective)
        
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
                print(f"[WARNING] Path reconstruction exceeded max iterations")
            
            print(f"\n[PATH] STEP 5 PATH RECONSTRUCTION:")
            print(f"   Reconstructed order: {' -> '.join([START_NODE] + visited_pois + [END_NODE])}")
        
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
        
        # Calculate order deviation from base itinerary
        order_deviation_count = 0
        if not freeze_order and len(visited_pois) > 1:
            base_order = {poi: idx for idx, poi in enumerate(candidate_pois)}
            for idx in range(len(visited_pois) - 1):
                i = visited_pois[idx]
                j = visited_pois[idx + 1]
                # Check if this edge violates base order
                if i in base_order and j in base_order:
                    if base_order[i] > base_order[j]:
                        order_deviation_count += 1
        
        # Calculate satisfaction scores
        family_obj = self.family_prefs[family_id]
        poi_satisfactions = []
        total_satisfaction = 0.0
        for poi in visited_pois:
            sat_score = self.calculate_satisfaction(family_obj, self.locations[poi])
            poi_satisfactions.append({
                'location_id': poi,
                'satisfaction_score': round(sat_score, 2)
            })
            total_satisfaction += sat_score
        
        # Calculate coherence loss components (using same formula as objective)
        alpha = 1.0    # Time weight
        beta = 1.0     # Cost weight
        gamma = 100.0  # Order deviation weight
        coherence_loss = alpha * total_transport_time + beta * total_transport_cost + gamma * order_deviation_count
        
        # Net value = satisfaction - λ·coherence_loss
        lambda_coherence = 0.3
        net_value = total_satisfaction - lambda_coherence * coherence_loss
        
        # Build solution
        solution = {
            'family_id': family_id,
            'day': day_index + 1,
            'objective_value': solver.ObjectiveValue(),
            'solve_time_seconds': solver.WallTime(),
            'total_transport_cost': total_transport_cost,
            'total_transport_time_min': total_transport_time,
            'order_deviation_count': order_deviation_count,
            'total_satisfaction': round(total_satisfaction, 2),
            'coherence_loss': round(coherence_loss, 2),
            'net_value': round(net_value, 2),
            'ordering_mode': 'frozen' if freeze_order else 'free',
            'base_order': candidate_pois if not freeze_order else None,
            'optimized_order': visited_pois,
            'pois': [
                {
                    'sequence': idx + 1,
                    'location_id': poi,
                    'location_name': self.locations[poi].name,
                    'arrival_time': self._minutes_to_time(solver.Value(arr[poi])),
                    'departure_time': self._minutes_to_time(solver.Value(dep[poi])),
                    'visit_duration_min': solver.Value(dep[poi]) - solver.Value(arr[poi]),
                    'arrival_minutes': solver.Value(arr[poi]),  # For debugging
                    'departure_minutes': solver.Value(dep[poi]),  # For debugging
                    'satisfaction_score': next(
                        (s['satisfaction_score'] for s in poi_satisfactions if s['location_id'] == poi),
                        0.0
                    )
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
        
        print("\n[OK] SANITY CHECK PASSED: Arrival times are monotonically increasing")
        
        # TRANSPORT CHECK: Verify transport modes are selected
        print(f"[OK] TRANSPORT CHECK: {len(transport_plan)} transport legs selected")
        for t in transport_plan:
            print(f"   {t['from_name']} -> {t['to_name']}: {t['mode']} ({t['duration_min']}min, Rs.{t['cost']})")
        
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

    def optimize_trip(
        self,
        family_ids: List[str],
        num_days: int = 3,
        lambda_divergence: float = 0.05,
        day_constraints: Dict[int, Dict[str, List[str]]] = None,  # NEW: Per-day constraints
        start_day_index: int = 0,               # NEW: Where to begin optimization
        initial_visited_history: Dict[str, set] = None  # NEW: Context from previous days
    ) -> Dict:
        """
        STEP 10: Multi-Day Trip Optimization
        Loops through days, optimizing one by one.
        """
        print(f"\n{'='*80}")
        print(f"STEP 10: MULTI-DAY TRIP OPTIMIZATION ({num_days} Days)")
        if start_day_index > 0:
            print(f"  Starting from Day {start_day_index + 1} (Partial Optimization)")
        print(f"{'='*80}\n")
        
        trip_solution = {
            "trip_id": self.base_itinerary.get("itinerary_id", "GENERIC_TRIP"),
            "families": family_ids,
            "days": [],
            "total_trip_cost": 0,
            "total_trip_time_min": 0,
        }
        
        # STEP 16: Initialize visited history for multi-day tracking
        import copy
        if initial_visited_history:
             visited_history = copy.deepcopy(initial_visited_history)
             print(f"[HISTORY] Initialized with history from previous days")
        else:
             visited_history = {fid: set() for fid in family_ids}
        
        for day_idx in range(start_day_index, num_days):
            print(f"\n>>> OPTIMIZING DAY {day_idx + 1} / {num_days} <<<")
            
            # Extract constraints for this day
            forced_include = None
            forced_exclude = None
            if day_constraints and day_idx in day_constraints:
                forced_include = day_constraints[day_idx].get("force_include")
                forced_exclude = day_constraints[day_idx].get("force_exclude")
            
            # Simple assumption: default time limits
            day_result = self.optimize_multi_family_single_day(
                family_ids,
                day_index=day_idx,
                max_pois=5, # Allow more POIs
                time_limit_seconds=60,
                lambda_divergence=lambda_divergence,
                visited_history=visited_history, # STEP 16: Pass history
                forced_include_pois=forced_include,
                forced_exclude_pois=forced_exclude
            )
            
            if day_result:
                trip_solution["days"].append(day_result)
                trip_solution["total_trip_cost"] += day_result["total_transport_cost"]
                trip_solution["total_trip_time_min"] += day_result["total_transport_time_min"]
                
                # STEP 16: Update History (Restored)
                for fid, fam_data in day_result['families'].items():
                    for poi in fam_data['pois']:
                        pid = poi['location_id']
                        if visited_history and fid in visited_history:
                             visited_history[fid].add(pid)
                             
                print(f"DAY {day_idx + 1} COMPLETE")
            else:
                break
                
        return trip_solution

    def find_best_day_for_poi(
        self,
        poi_id: str,
        candidate_days: List[int],
        base_itinerary: Dict,
        method: str = "average"
    ) -> Tuple[int, float]:
        """
        Find best day to place a requested POI based on geographic proximity.
        
        Uses average distance to skeleton POIs to predict transport cost.
        
        Args:
            poi_id: POI to place (e.g., "LOC_CHANDNI_CHOWK")
            candidate_days: Days to consider (0-indexed, e.g., [1, 2] for Days 2-3)
            base_itinerary: Base itinerary with skeleton POIs
            method: "average" (distance to all POIs) or "centroid" (not implemented)
        
        Returns:
            Tuple of (best_day_index, distance_score in km)
        
        Example:
            # Find best day for Chandni Chowk between Days 2-3
            best_day, dist = optimizer.find_best_day_for_poi(
                poi_id="LOC_CHANDNI_CHOWK",
                candidate_days=[1, 2],  # Days 2 and 3
                base_itinerary=base_itinerary
            )
            # → (2, 3.83)  # Day 3 with 3.83 km avg distance
        """
        requested_loc = self.locations[poi_id]
        best_day = candidate_days[0]
        best_score = float('inf')
        
        print(f"\n[LOOK-AHEAD] Finding best day for {requested_loc.name}")
        print(f"  Candidate days: {[d+1 for d in candidate_days]}")  # 1-indexed
        
        for day_idx in candidate_days:
            if day_idx >= len(base_itinerary['days']):
                continue
                
            skeleton_pois = base_itinerary['days'][day_idx]['pois']
            
            if not skeleton_pois:
                continue
            
            # Calculate average distance to all skeleton POIs
            total_dist = 0
            for skel_poi in skeleton_pois:
                skel_loc = self.locations[skel_poi['location_id']]
                dist = self._haversine_distance(requested_loc, skel_loc)
                total_dist += dist
            
            score = total_dist / len(skeleton_pois)
            
            print(f"  Day {day_idx + 1}: {score:.2f} km avg")
            
            if score < best_score:
                best_score = score
                best_day = day_idx
        
        print(f"  → Best fit: Day {best_day + 1} ({best_score:.2f} km)\n")
        return best_day, best_score

    def reoptimize_from_current_state(
        self,
        current_solution: Dict,
        target_day_index: int,
        family_ids: List[str],
        lambda_divergence: float = 0.05,
        day_constraints: Dict[int, Dict[str, List[str]]] = None  # NEW: Per-day constraints
    ) -> Dict:
        """
        Re-optimize trip from current state, re-optimizing a specific day.
        
        Preserves completed days, re-optimizes target day with updated preferences,
        and reconstructs full trip solution.
        
        Args:
            current_solution: Existing trip solution (Days 1-N)
            target_day_index: Day to re-optimize (0-indexed, e.g., 2 = Day 3)
            family_ids: Families to optimize for
            lambda_divergence: Divergence penalty
        
        Returns:
            Updated trip solution with re-optimized day
        
        Example:
            # At Day 2, user adds POI to Day 3 preferences
            # Re-optimize Day 3 only, preserve Days 1-2
            new_solution = optimizer.reoptimize_from_current_state(
                current_solution=existing_trip_solution,
                target_day_index=2,  # Re-optimize Day 3
                family_ids=["FAM_A", "FAM_B", "FAM_C"]
            )
        """
        print(f"\n{'='*80}")
        print(f"RE-OPTIMIZING FROM CURRENT STATE")
        print(f"  Target Day: {target_day_index + 1}")
        print(f"{'='*80}\n")
        
        # Step 1: Extract visited history from completed days
        visited_history = {fid: set() for fid in family_ids}
        
        for day_idx in range(target_day_index):
            if day_idx >= len(current_solution['days']):
                break
            day_data = current_solution['days'][day_idx]
            for fid, fam_data in day_data['families'].items():
                for poi in fam_data['pois']:
                    visited_history[fid].add(poi['location_id'])
        
        print(f"[HISTORY] Extracted visited POIs from Days 1-{target_day_index}:")
        for fid, pois in visited_history.items():
            print(f"  {fid}: {len(pois)} POIs visited")
        
        # Step 2: Re-optimize target day with history
        print(f"\n[REOPT] Re-optimizing Day {target_day_index + 1}...")
        
        # Extract constraints for this day
        forced_include = None
        forced_exclude = None
        if day_constraints and target_day_index in day_constraints:
            forced_include = day_constraints[target_day_index].get("force_include")
            forced_exclude = day_constraints[target_day_index].get("force_exclude")
        
        day_result = self.optimize_multi_family_single_day(
            family_ids=family_ids,
            day_index=target_day_index,
            max_pois=5,
            time_limit_seconds=60,
            lambda_divergence=lambda_divergence,
            visited_history=visited_history,  # ← Preserves past days!
            forced_include_pois=forced_include,
            forced_exclude_pois=forced_exclude
        )
        
        if not day_result:
            print(f"[ERROR] Re-optimization failed for Day {target_day_index + 1}")
            return current_solution
        
        print(f"[SUCCESS] Day {target_day_index + 1} re-optimized")
        
        # Step 3: Reconstruct full trip solution
        new_trip_solution = {
            "trip_id": current_solution.get("trip_id", "TRIP_REOPT"),
            "families": family_ids,
            "days": [],
            "total_trip_cost": 0,
            "total_trip_time_min": 0,
        }
        
        # Add completed days (unchanged)
        for day_idx in range(target_day_index):
            if day_idx >= len(current_solution['days']):
                break
            day_data = current_solution['days'][day_idx]
            new_trip_solution["days"].append(day_data)
            new_trip_solution["total_trip_cost"] += day_data["total_transport_cost"]
            new_trip_solution["total_trip_time_min"] += day_data["total_transport_time_min"]
        
        # Add re-optimized day
        new_trip_solution["days"].append(day_result)
        new_trip_solution["total_trip_cost"] += day_result["total_transport_cost"]
        new_trip_solution["total_trip_time_min"] += day_result["total_transport_time_min"]
        
        # Add future days (if any, unchanged)
        for day_idx in range(target_day_index + 1, len(current_solution['days'])):
            day_data = current_solution['days'][day_idx]
            new_trip_solution["days"].append(day_data)
            new_trip_solution["total_trip_cost"] += day_data["total_transport_cost"]
            new_trip_solution["total_trip_time_min"] += day_data["total_transport_time_min"]
        
        print(f"\n[COMPLETE] Trip solution reconstructed:")
        print(f"  Days 1-{target_day_index}: Preserved (unchanged)")
        print(f"  Day {target_day_index + 1}: Re-optimized ✓")
        if target_day_index + 1 < len(current_solution['days']):
            print(f"  Days {target_day_index + 2}-{len(current_solution['days'])}: Preserved (unchanged)")
        
        return new_trip_solution


    def optimize_multi_family_single_day(
        self,
        family_ids: List[str] = ["FAM_001", "FAM_002"],
        day_index: int = 0,
        max_pois: int = 3,
        time_limit_seconds: int = 60,
        lambda_divergence: float = 0.05,
        visited_history: Dict[str, set] = None, # STEP 16: Added argument
        forced_include_pois: List[str] = None, # NEW: Force specific POIs (Look-Ahead)
        forced_exclude_pois: List[str] = None, # NEW: Exclude specific POIs (Look-Ahead)
        enable_trace: bool = True  # NEW: Enable decision tracing
    ) -> Optional[Dict]:
        """
        STEP 9/10: Optimize itinerary for MULTIPLE families, 1 day.
        Supports explicit physical Start/End locations (e.g. Hotel).
        """
        families = {fid: self.family_prefs[fid] for fid in family_ids}
        
        # Safe access to day data
        if day_index >= len(self.base_itinerary['days']):
            print(f"Error: Day index {day_index} out of range")
            return None
            
        day_data = self.base_itinerary['days'][day_index]
        assumptions = self.base_itinerary['assumptions']
        
        # STEP 10B: Physical Anchors
        # Check if day has explicit start/end locations (e.g. LOC_HOTEL)
        start_loc_id = day_data.get('start_location')
        end_loc_id = day_data.get('end_location')
        
        day_start_min = self._time_to_minutes(assumptions['day_start_time'])
        day_end_min = self._time_to_minutes(assumptions['day_end_time'])
        
        base_pois = [poi['location_id'] for poi in day_data['pois'][:max_pois]]
        candidate_pois = base_pois[:max_pois]
        
        if not candidate_pois:
            return None
        
        # STEP 9B′: Separate POIs by role
        skeleton_pois = []
        branch_pois = []
        
        for poi_id in candidate_pois:
            loc = self.locations[poi_id]
            role = getattr(loc, 'role', 'SKELETON')
            if role == 'SKELETON':
                skeleton_pois.append(poi_id)
            else:
                branch_pois.append(poi_id)
        
        print(f"\n[DAY {day_index+1}] POI Classification (Before Expansion):")
        print(f"  - SKELETON POIs ({len(skeleton_pois)}): {skeleton_pois}")
        print(f"  - BRANCH POIs ({len(branch_pois)}): {branch_pois}")
        
        # STEP 15: Preference-Driven Branch Expansion
        # Expand candidates from locations.json
        expanded_pois = self.expand_branch_pois_for_day(
            day_index=day_index,
            family_ids=family_ids,
            skeleton_filter=skeleton_pois,
            base_pois_filter=base_pois, # Exclude anything already in base plan
            max_total_branch=5, # Cap expansion
            radius_km=5.0
        )
        
        # Merge and Cap
        # Note: We append expanded POIs to candidate_pois. 
        # Since they are not in skeleton_pois, they are implicitly treated as BRANCH role
        # equivalent once we set their role attribute dynamically or handle them as non-skeleton.
        
        for new_poi in expanded_pois:
            if new_poi not in candidate_pois:
                candidate_pois.append(new_poi)
                branch_pois.append(new_poi)
                # DYNAMICALY PATCH ROLE
                if hasattr(self.locations[new_poi], 'role'):
                     self.locations[new_poi].role = 'BRANCH'
        
        # STEP 15B: Apply Forced Includes/Excludes (Look-Ahead)
        if forced_include_pois:
            print(f"  [CONSTRAINT] Forcing inclusion of: {forced_include_pois}")
            for pid in forced_include_pois:
                if pid not in self.locations:
                    print(f"  [WARNING] Forced POI {pid} not found in locations DB")
                    continue
                    
                if pid not in candidate_pois:
                    candidate_pois.append(pid)
                    branch_pois.append(pid) # Assume branch if forced
                    
        if forced_exclude_pois:
            print(f"  [CONSTRAINT] Forcing exclusion of: {forced_exclude_pois}")
            candidate_pois = [p for p in candidate_pois if p not in forced_exclude_pois]
            branch_pois = [p for p in branch_pois if p not in forced_exclude_pois]
        
        # Safety Cap (Exponential complexity protection)
        # Ensure forced_include_pois are NOT pruned
        MAX_TOTAL_CANDIDATES = 12
        if len(candidate_pois) > MAX_TOTAL_CANDIDATES:
             # Prioritize: Skeleton + Forced + others
             priority_pois = set(skeleton_pois)
             if forced_include_pois:
                 priority_pois.update(forced_include_pois)
             
             kept_pois = list(priority_pois)
             remaining_slots = MAX_TOTAL_CANDIDATES - len(kept_pois)
             
             if remaining_slots > 0:
                 for p in candidate_pois:
                     if p not in priority_pois:
                         kept_pois.append(p)
                         remaining_slots -= 1
                         if remaining_slots == 0:
                             break
             
             print(f"[WARNING] Pruning candidates from {len(candidate_pois)} to {len(kept_pois)}")
             candidate_pois = kept_pois
             
        print(f"\n[DAY {day_index+1}] POI Classification (After Expansion):")
        print(f"  - SKELETON POIs ({len(skeleton_pois)}): {skeleton_pois}")
        print(f"  - BRANCH POIs ({len(branch_pois)}): {branch_pois}")
        print(f"  - TOTAL CANDIDATES: {len(candidate_pois)}")
        
        if start_loc_id: print(f"  - START ANCHOR: {start_loc_id}")
        if end_loc_id:   print(f"  - END ANCHOR:   {end_loc_id}")

        # STEP 10C: Override Anchors from Hotel Backbone (If available)
        assigned_hotel_id = None
        if family_ids and family_ids[0] in self.hotel_assignments:
            for plan in self.hotel_assignments[family_ids[0]]:
                if plan['day'] == day_index + 1:
                    assigned_hotel_id = plan['hotel_id']
                    break
        
        if assigned_hotel_id:
            print(f"  [BACK_BONE] Overriding Start/End with Hotel: {assigned_hotel_id}")
            start_loc_id = assigned_hotel_id
            end_loc_id = assigned_hotel_id
        
        # TRACE: A. Candidate POIs
        if enable_trace:
            self.decision_traces[day_index] = {
                "candidates": [],
                "constraints": [],
                "outcome": None
            }
            # Log candidates per family (simplified as candidates are shared but scores differ)
            for fid in family_ids:
                fam_defaults = []
                for pid in candidate_pois:
                    loc = self.locations[pid]
                    fam_defaults.append({
                        "poi_id": pid,
                        "interest_score": self.calculate_satisfaction(families[fid], loc), # Raw score
                        "role": getattr(loc, 'role', 'BRANCH') if pid not in skeleton_pois else 'SKELETON',
                         # Estimate cost (optional, skipping for MV)
                    })
                self.decision_traces[day_index]["candidates"].append({
                    "family": fid,
                    "day": day_index + 1,
                    "candidates": fam_defaults
                })

        model = cp_model.CpModel()
        
        START_NODE = f"START_DAY_{day_index + 1}"
        END_NODE = f"END_DAY_{day_index + 1}"
        
        skeleton_nodes = [START_NODE] + skeleton_pois + [END_NODE]
        all_nodes = [START_NODE] + candidate_pois + [END_NODE]
        
        # SHARED: Ordering variables y[i,j] ONLY for skeleton nodes
        y = {}
        for i in skeleton_nodes:
            for j in skeleton_nodes:
                if i != j and j != START_NODE and i != END_NODE:
                    y[(i, j)] = model.NewBoolVar(f'order_{i}_before_{j}')

        # STEP 10D: Inject Backbone Hints (Warm Start)
        backbone_order = self.backbone_routes.get(str(day_index + 1), [])
        if backbone_order:
             # print(f"  [BACK_BONE] Injecting route hint: {backbone_order}")
             for k in range(len(backbone_order) - 1):
                 u, v = backbone_order[k], backbone_order[k+1]
                 # Note: y keys are (u, v).
                 # We need to map backbone POIs to START/END if they are first/last
                 # But backbone is strictly POI->POI.
                 # The ItineraryOptimizer solves START->POI...->END.
                 # So we only hint POI->POI edges.
                 if (u, v) in y:
                     model.AddHint(y[(u, v)], 1)
        
        # FAMILY-SPECIFIC: Visit decisions x[f,i]
        
        # STEP 16: Enforce Global Repeatability (Applied to x)
        # Banned POIs will just have x implied to 0 (or forced)
        banned_pois = {fid: set() for fid in family_ids}
        
        if visited_history:
            for fid in family_ids:
                if fid in visited_history:
                    for past_poi in visited_history[fid]:
                        if past_poi in candidate_pois:
                            # EXEMPTION: If it is a skeleton POI for this day, allow revisit (mandatory)
                            if past_poi in skeleton_pois:
                                # print(f"DEBUG: {past_poi} is SKELETON on Day {day_index+1}, exempt from ban.")
                                continue
                                
                            loc_def = self.locations[past_poi]
                            if not loc_def.repeatable:
                                # Ban revisit
                                # print(f"  [CONSTRAINT] {fid} cannot revisit {loc_def.name} ({past_poi}) (Day {day_index+1})")
                                banned_pois[fid].add(past_poi)
                                if enable_trace:
                                    self.decision_traces[day_index]["constraints"].append({
                                        "constraint_id": f"HISTORY_BAN_{fid}_{past_poi}",
                                        "type": "HISTORY_BAN",
                                        "applies_to": {"family": fid, "poi": past_poi}
                                    })

        x = {}
        for fid in family_ids:
            for poi in candidate_pois:
                x[(fid, poi)] = model.NewBoolVar(f'visit_{fid}_{poi}')
                
                # Apply Ban
                if poi in banned_pois[fid]:
                    model.Add(x[(fid, poi)] == 0)
        # (Duplicate loop removed)
        
        # FAMILY-SPECIFIC: Arrival and departure times
        arr = {}
        dep = {}
        for fid in family_ids:
            for poi in candidate_pois:
                arr[(fid, poi)] = model.NewIntVar(day_start_min, day_end_min, f'arr_{fid}_{poi}')
                dep[(fid, poi)] = model.NewIntVar(day_start_min, day_end_min, f'dep_{fid}_{poi}')
        
        # STEP 11: Time Window Constraints (Meal Planning)
        poi_details = {p['location_id']: p for p in day_data['pois']}
        
        for poi_id in candidate_pois:
             details = poi_details.get(poi_id)
             if details:
                 # Start Window (e.g. Lunch must start after 12:30)
                 if 'time_window_start' in details:
                     min_start = self._time_to_minutes(details['time_window_start'])
                     for fid in family_ids:
                         model.Add(arr[(fid, poi_id)] >= min_start)
                         if enable_trace:
                             self.decision_traces[day_index]["constraints"].append({
                                 "constraint_id": f"TIME_START_{poi_id}",
                                 "type": "HARD_TIME_WINDOW",
                                 "applies_to": {"family": fid, "poi": poi_id}
                             })
                 
                 # End Window (e.g. Lunch must end before 14:00)
                 if 'time_window_end' in details:
                     max_end = self._time_to_minutes(details['time_window_end'])
                     for fid in family_ids:
                         model.Add(dep[(fid, poi_id)] <= max_end)
                         if enable_trace:
                             self.decision_traces[day_index]["constraints"].append({
                                 "constraint_id": f"TIME_END_{poi_id}",
                                 "type": "HARD_TIME_WINDOW",
                                 "applies_to": {"family": fid, "poi": poi_id}
                             })
        
        for fid in family_ids:
            arr[(fid, START_NODE)] = day_start_min
            dep[(fid, START_NODE)] = day_start_min
            arr[(fid, END_NODE)] = day_end_min
            dep[(fid, END_NODE)] = day_end_min
        
        # STEP 9C: Hybrid Synced TSP
        adj = {}
        best_transport_edges = {}
        
        # Pre-calculate best transport edges
        for i in all_nodes:
            for j in all_nodes:
                if i == j or j == START_NODE or i == END_NODE:
                    continue
                
                key = (i, j)
                best_edge = None
                
                # Handling Start/End Anchors (Step 10B)
                source_loc = i
                target_loc = j
                
                is_logical_edge = False
                
                if i == START_NODE:
                    if start_loc_id:
                        source_loc = start_loc_id # Use physical hotel
                    else:
                        is_logical_edge = True # Legacy behavior
                        
                if j == END_NODE:
                    if end_loc_id:
                        target_loc = end_loc_id # Use physical hotel
                    else:
                        is_logical_edge = True
                
                if is_logical_edge:
                    best_edge = TransportEdge(
                        edge_id=f"LOGICAL_{i}_{j}",
                        from_loc=i, to_loc=j, mode="LOGICAL",
                        duration_min=0, cost=0, reliability=1.0
                    )
                else:
                    # Find real transport
                    search_key = (source_loc, target_loc)
                    candidates = []
                    if search_key in self.transport_lookup:
                        candidates.extend(self.transport_lookup[search_key])
                    
                    # Always allow fallback if explicit transport missing
                    candidates.append(self._create_fallback_transport(source_loc, target_loc))
                    
                    # Select best
                    best_edge = min(candidates, key=lambda e: e.duration_min * 2 + e.cost)
                
                best_transport_edges[key] = best_edge
        
        # Create adj variables for all possible transitions
        for fid in family_ids:
            for i in all_nodes:
                for j in all_nodes:
                    if i == j or j == START_NODE or i == END_NODE:
                        continue
                    
                    # Create variable
                    adj[(fid, i, j)] = model.NewBoolVar(f'adj_{fid}_{i}_{j}')
        
        # CONSTRAINTS
        
        # 1. FAMILY-SPECIFIC: Departure = Arrival + Visit Time
        for fid in family_ids:
            for poi in candidate_pois:
                visit_time = self.locations[poi].avg_visit_time_min
                model.Add(dep[(fid, poi)] == arr[(fid, poi)] + visit_time)
        
        # 2. FAMILY-SPECIFIC: Flow Conservation (Standard TSP)
        # If family visits node i, must have 1 incoming and 1 outgoing edge
        for fid in family_ids:
            # For each candidate POI
            for node in candidate_pois:
                # Incoming
                incoming = [adj[(fid, i, node)] for i in all_nodes if i != node and (fid, i, node) in adj]
                model.Add(sum(incoming) == 1).OnlyEnforceIf(x[(fid, node)])
                model.Add(sum(incoming) == 0).OnlyEnforceIf(x[(fid, node)].Not())
                
                # Outgoing
                outgoing = [adj[(fid, node, j)] for j in all_nodes if j != node and (fid, node, j) in adj]
                model.Add(sum(outgoing) == 1).OnlyEnforceIf(x[(fid, node)])
                model.Add(sum(outgoing) == 0).OnlyEnforceIf(x[(fid, node)].Not())
            
            # Start Node: 1 Outgoing
            start_outgoing = [adj[(fid, START_NODE, j)] for j in candidate_pois] # Can go to any POI
            # We assume day always starts? Or only if family visits something? 
            # Safe assumption: always starts if any POI visited. 
            # Simplified: Sum(adj[start, j]) == 1 (always active for this problem scope)
            model.Add(sum(start_outgoing) == 1)
            
            # End Node: 1 Incoming
            end_incoming = [adj[(fid, i, END_NODE)] for i in candidate_pois]
            model.Add(sum(end_incoming) == 1)

        # 3. SHARED: Skeleton Ordering Constraints
        # Keep 'y' variables to enforce shared backbone order
        # If y[s1, s2] == 1, then for ALL families, arr[s2] >= dep[s1]
        # This synchronizes the group even if they take side trips defined by 'adj'
        
        
        # 3. SHARED: Skeleton Ordering Constraints
        # Keep 'y' variables to enforce shared backbone order
        # If y[s1, s2] == 1, then for ALL families, arr[s2] >= dep[s1]
        
        # 3A. Enforce Flow Conservation for 'y' (The Backbone)
        # If a Skeleton POI is visited by ANY family, it must be in the 'y' chain
        for spi in skeleton_pois:
            # Check if ANY family visits this skeleton POI
            is_visited_vars = [x[(fid, spi)] for fid in family_ids]
            # Create a boolean 'is_active' for the skeleton node
            is_active = model.NewBoolVar(f'skeleton_active_{spi}')
            model.Add(sum(is_visited_vars) >= 1).OnlyEnforceIf(is_active)
            model.Add(sum(is_visited_vars) == 0).OnlyEnforceIf(is_active.Not())
            
            # Flow constraints for 'y' based on is_active
            incoming_y = [y[(i, spi)] for i in skeleton_nodes if i != spi and (i, spi) in y]
            outgoing_y = [y[(spi, j)] for j in skeleton_nodes if j != spi and (spi, j) in y]
            
            if incoming_y and outgoing_y:
                model.Add(sum(incoming_y) == 1).OnlyEnforceIf(is_active)
                model.Add(sum(outgoing_y) == 1).OnlyEnforceIf(is_active)
                model.Add(sum(incoming_y) == 0).OnlyEnforceIf(is_active.Not())
                model.Add(sum(outgoing_y) == 0).OnlyEnforceIf(is_active.Not())
        
        # Start/End flow for y
        start_out_y = [y[(START_NODE, j)] for j in skeleton_pois if (START_NODE, j) in y]
        start_out_y.append(y[(START_NODE, END_NODE)]) # Allow direct skip if no skeleton
        model.Add(sum(start_out_y) == 1)
        
        end_in_y = [y[(i, END_NODE)] for i in skeleton_pois if (i, END_NODE) in y]
        end_in_y.append(y[(START_NODE, END_NODE)])
        model.Add(sum(end_in_y) == 1)

        # 3B. Synchronization Logic (`y` implies order AND strict timing)
        
        # A. Sequence Enforcement (Backbone)
        for s1 in skeleton_nodes:
            for s2 in skeleton_nodes:
                if s1 == s2 or s1 == END_NODE or s2 == START_NODE:
                    continue
                
                if (s1, s2) in y:
                    for fid in family_ids:
                        # If s1 -> s2 in skeleton, s2 must be after s1
                        model.Add(arr[(fid, s2)] >= dep[(fid, s1)]).OnlyEnforceIf(y[(s1, s2)])

        # B. Strict Time Synchronization (Shared Bus)
        # All families must arrive at Skeleton POIs at the exact same time
        # This forces the "faster" family to wait or start later
        for spi in skeleton_pois:
            # Get arrival variable for first family
            base_fid = family_ids[0]
            base_arr = arr[(base_fid, spi)]
            
            for i in range(1, len(family_ids)):
                other_fid = family_ids[i]
                other_arr = arr[(other_fid, spi)]
                
                # Strict Equality: arr[f1] == arr[f2]
                # Only enforce if both families actually visit the POI
                # (Though for Skeleton POIs, they usually all visit)
                
                # Create a boolean AND of visits
                both_visit = model.NewBoolVar(f'sync_{spi}_{base_fid}_{other_fid}')
                model.AddBoolAnd([x[(base_fid, spi)], x[(other_fid, spi)]]).OnlyEnforceIf(both_visit)
                model.AddBoolOr([x[(base_fid, spi)].Not(), x[(other_fid, spi)].Not()]).OnlyEnforceIf(both_visit.Not())
                
                # Enforce sync
                model.Add(base_arr == other_arr).OnlyEnforceIf(both_visit)

        # 4. FAMILY-SPECIFIC: Physical Time & Transport Constraints
        # For each physical edge traversed (adj[f, i, j]), enforce time and add cost
        
        cost_terms = []
        time_terms = []
        
        for fid in family_ids:
            for i in all_nodes:
                for j in all_nodes:
                    if i == j or j == START_NODE or i == END_NODE:
                        continue
                    
                    if (fid, i, j) not in adj:
                        continue
                    
                    # Physical Time Constraint
                    duration = 0
                    cost = 0
                    
                    if i == START_NODE:
                         # FAMILY-SPECIFIC START (From Hotel)
                         hotel_id = "LOC_HOTEL"
                         if fid in self.hotel_assignments:
                             for plan in self.hotel_assignments[fid]:
                                 if plan['day'] == day_index + 1:
                                     hotel_id = plan['hotel_id']
                                     break
                         edge_params = self.get_best_transport_edge(hotel_id, j)
                         if edge_params:
                             duration = edge_params['duration_min']
                             cost = edge_params['cost']
                         
                         model.Add(arr[(fid, j)] >= day_start_min + duration).OnlyEnforceIf(adj[(fid, i, j)])
                         
                         # Check-out Constraint (Last Day) - Assumes Day 3 is last
                         if day_index == 2:
                             check_out_string = "11:00"
                             # Optional: Look up if back_bone has check_out info
                             check_out_time = self._time_to_minutes(check_out_string)
                             # Constraint: Must leave start node (hotel) by check-out time
                             # But dep[START] is start of day. 
                             # We actually just simply enforce day_start_min is effectively the departure?
                             # Or better: arr[first_poi] >= day_start + duration.
                             # If we leave hotel at 11:00 max, then arr[j] <= 11:00 + duration? relative to day start?
                             # Actually, dep[START] is effectively day_start_min.
                             # If we strictly must checkout, it means we cannot NOT leave. 
                             # But here we model the tour start.
                             pass

                    elif j == END_NODE:
                         # FAMILY-SPECIFIC END (To Hotel)
                         hotel_id = "LOC_HOTEL"
                         if fid in self.hotel_assignments:
                             for plan in self.hotel_assignments[fid]:
                                 if plan['day'] == day_index + 1:
                                     hotel_id = plan['hotel_id']
                                     break

                         edge_params = self.get_best_transport_edge(i, hotel_id)
                         if edge_params:
                             duration = edge_params['duration_min']
                             cost = edge_params['cost']

                         model.Add(dep[(fid, i)] + duration <= day_end_min).OnlyEnforceIf(adj[(fid, i, j)])
                         
                         # Check-in Constraint (Day 1)
                         if day_index == 0:
                             check_in_string = "14:00"
                             # Optional: Look up if back_bone has check_in info
                             check_in_time = self._time_to_minutes(check_in_string)
                             
                             # Arrival at Hotel (End Node) must be >= check_in_time
                             # We model arr[END_NODE] implicitly via dep[i] + duration
                             # So dep[i] + duration >= check_in_time
                             model.Add(dep[(fid, i)] + duration >= check_in_time).OnlyEnforceIf(adj[(fid, i, j)])

                    else:
                         # POI to POI (Shared Edge)
                         best_edge = best_transport_edges.get((i, j))
                         duration = best_edge.duration_min if best_edge else 0
                         cost = best_edge.cost if best_edge else 0
                         model.Add(arr[(fid, j)] >= dep[(fid, i)] + duration).OnlyEnforceIf(adj[(fid, i, j)])
                    
                    # Add to objective (Cost & Time)
                    # We add cost PER FAMILY travel
                    cost_terms.append(cost * adj[(fid, i, j)])
                    time_terms.append(duration * adj[(fid, i, j)])

        # 5. REMOVED: Old shared flow constraints for skeleton (replaced by adj + sync)
        # 5B. REMOVED: Branch POI Time Window Attachment (replaced by adj)
        
        total_cost = sum(cost_terms) if cost_terms else 0
        total_time = sum(time_terms) if time_terms else 0
        
        # 6. FAMILY-SPECIFIC: Must-visit and never-visit constraints
        
        # 5B. BRANCH POIs: Time window attachment (NOT in shared ordering)
        # 6. FAMILY-SPECIFIC: Must-visit and never-visit constraints
        for fid in family_ids:
            family = families[fid]
            
            # Enforce must-visit locations
            for must_visit_poi in family.must_visit_locations:
                if must_visit_poi in candidate_pois:
                    model.Add(x[(fid, must_visit_poi)] == 1)
            
            # Enforce never-visit locations
            for never_visit_poi in family.never_visit_locations:
                if never_visit_poi in candidate_pois:
                    model.Add(x[(fid, never_visit_poi)] == 0)
            
            # STEP 9B′: Ensure families visit skeleton POIs (anchor points)
            # But respect never-visit constraints
            available_skeleton = [poi for poi in skeleton_pois if poi not in family.never_visit_locations]
            if available_skeleton:
                # FIX: Don't force 2 if only 1 exists
                desired_skeleton_visits = len(available_skeleton) 
                skeleton_visit_sum = sum([x[(fid, poi)] for poi in available_skeleton])
                model.Add(skeleton_visit_sum >= desired_skeleton_visits)
        
        # NOTE: Equal POI count constraint removed - it prevents divergence
        # and makes problem infeasible when families have conflicting must-visit requirements
        
        # 7. FAMILY-SPECIFIC: Time bounds
        for fid in family_ids:
            for poi in candidate_pois:
                model.Add(arr[(fid, poi)] >= day_start_min)
                model.Add(dep[(fid, poi)] <= day_end_min)
        
        # OBJECTIVE
        
        # OBJECTIVE: Satisfaction (ONLY for visited POIs!)
        satisfaction_terms = []
        for fid in family_ids:
            family = families[fid]
            for poi in candidate_pois:
                sat_score = self.calculate_satisfaction(family, self.locations[poi])
                sat_scaled = int(sat_score * 100)
                
                # PERSONALIZATION BONUS: Reward visiting must-visit locations
                must_visit_bonus = 0
                if poi in family.must_visit_locations:
                    must_visit_bonus = 200  # Significant bonus for must-visit POIs
                
                # CRITICAL: Only count satisfaction if POI is visited
                satisfaction_terms.append((sat_scaled + must_visit_bonus) * x[(fid, poi)])
        
        total_satisfaction = sum(satisfaction_terms)
        
        # Legacy transport cost calculation removed (replaced by adj based total_cost)
        
        base_order = {poi: idx for idx, poi in enumerate(candidate_pois)}
        order_deviation_terms = []
        
        for i in candidate_pois:
            for j in candidate_pois:
                if i != j and (i, j) in y:
                    if base_order[i] > base_order[j]:
                        order_deviation_terms.append(100 * y[(i, j)])
        
        total_order_deviation = sum(order_deviation_terms) if order_deviation_terms else 0
        
        # STEP 9B: Inter-family divergence penalty
        divergence_terms = []
        if len(family_ids) >= 2:
            for i in range(len(family_ids)):
                for j in range(i + 1, len(family_ids)):
                    fid1 = family_ids[i]
                    fid2 = family_ids[j]
                    for poi in candidate_pois:
                        diff = model.NewIntVar(0, 1, f'diff_{fid1}_{fid2}_{poi}')
                        model.Add(diff >= x[(fid1, poi)] - x[(fid2, poi)])
                        model.Add(diff >= x[(fid2, poi)] - x[(fid1, poi)])
                        divergence_terms.append(100 * diff)
        
        total_divergence = sum(divergence_terms) if divergence_terms else 0
        
        # STEP 9B′: Branch penalty (discourage excessive branching)
        branch_penalty_weight = 0  # TEST: Set to 0 to verify divergence mechanism works
        branch_penalty_terms = []
        for fid in family_ids:
            for branch_poi in branch_pois:
                branch_penalty_terms.append(branch_penalty_weight * x[(fid, branch_poi)])
        
        total_branch_penalty = sum(branch_penalty_terms) if branch_penalty_terms else 0
        
        alpha = 1
        beta = 1
        gamma = 1
        delta = int(lambda_divergence * 100)
        
        coherence_loss = alpha * total_time + beta * total_cost + gamma * total_order_deviation + delta * total_divergence
        
        # TUNED PARAMETERS
        lambda_coherence = 2  # Reduced from 10 to make transport cheaper and enable branch POI visits
        
        # STEP 9B′: Objective includes branch penalty
        objective = total_satisfaction - lambda_coherence * coherence_loss - total_branch_penalty
        
        model.Maximize(objective)
        
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = time_limit_seconds
        solver.parameters.log_search_progress = True
        
        status = solver.Solve(model)
        
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            solution = self._extract_multi_family_solution(
                solver, x, y, adj, arr, dep,
                candidate_pois, best_transport_edges, family_ids, day_index, all_nodes
            )
            
            # TRACE: C. Solver Outcome
            if enable_trace and solution:
                outcome = {
                    "family": "ALL", # Joint optimization
                    "day": day_index + 1,
                    "selected_pois": list(set([p['location_id'] for fam in solution['families'].values() for p in fam['pois']])),
                    "objective_breakdown": {
                        "total_satisfaction": solution.get('total_satisfaction', 0),
                        "coherence_loss": solution.get('coherence_loss', 0),
                        "net_value": solution.get('net_value', 0)
                    }
                }
                # Find rejected eligible POIs
                outcome["rejected_eligible_pois"] = [p for p in candidate_pois if p not in outcome["selected_pois"]]
                self.decision_traces[day_index]["outcome"] = outcome
                
            return solution
        else:
            print(f"No feasible solution found. Status: {solver.StatusName(status)}")
            return None
    
    def _extract_multi_family_solution(
        self,
        solver: cp_model.CpSolver,
        x: Dict,
        y: Dict,
        adj: Dict,
        arr: Dict,
        dep: Dict,
        candidate_pois: List[str],
        best_transport_edges: Dict,
        family_ids: List[str],
        day_index: int,
        all_nodes: List[str]
    ) -> Dict:
        """Extract solution for multi-family optimization"""
        
        START_NODE = all_nodes[0]
        END_NODE = all_nodes[-1]
        
        visited_pois = []
        current = START_NODE
        max_iterations = len(candidate_pois) + 2
        iteration = 0
        
        while current != END_NODE and iteration < max_iterations:
            iteration += 1
            next_node = None
            for j in all_nodes:
                if current != j and (current, j) in y:
                    if solver.Value(y[(current, j)]) == 1:
                        next_node = j
                        break
            
            if next_node is None:
                break
            
            if next_node != END_NODE:
                visited_pois.append(next_node)
            
            current = next_node
        
        print(f"\n[PATH] SHARED POI ORDER: {' -> '.join([START_NODE] + visited_pois + [END_NODE])}")
        
        print(f"\n[PATH] SHARED POI ORDER: {' -> '.join([START_NODE] + visited_pois + [END_NODE])}")
        
        # Aggregated totals from family specifics
        total_transport_cost = 0
        total_transport_time = 0
        
        families_data = {}
        for fid in family_ids:
            family_obj = self.family_prefs[fid]
            
            # STEP 9C: Extract path from adj variables (Hybrid Synced TSP)
            # Reconstruct the physical path: START -> P1 -> P2 -> ... -> END
            
            # Find the starting edge
            current_node = START_NODE
            path_nodes = []
            family_transport = []
            
            # Robust extraction loop with safety break
            safety_counter = 0
            while current_node != END_NODE and safety_counter < len(all_nodes) + 5:
                # Find the next node connected by adj[fid, current, next] == 1
                next_node = None
                for candidate in all_nodes:
                    if candidate == current_node or candidate == START_NODE:
                        continue
                    
                    if (fid, current_node, candidate) in adj:
                        if solver.Value(adj[(fid, current_node, candidate)]) == 1:
                            next_node = candidate
                            break
                
                if next_node:
                    # Extract transport details
                    edge_params = None
                    
                    if current_node == START_NODE:
                        hotel_id = "LOC_HOTEL"
                        if fid in self.hotel_assignments:
                            for plan in self.hotel_assignments[fid]:
                                if plan['day'] == day_index + 1:
                                    hotel_id = plan['hotel_id']
                                    break
                        # Recalculate best edge from Hotel -> Next Node
                        edge_params = self.get_best_transport_edge(hotel_id, next_node)
                    elif next_node == END_NODE:
                        hotel_id = "LOC_HOTEL"
                        if fid in self.hotel_assignments:
                            for plan in self.hotel_assignments[fid]:
                                if plan['day'] == day_index + 1:
                                    hotel_id = plan['hotel_id']
                                    break
                        # Recalculate best edge from Current Node -> Hotel
                        edge_params = self.get_best_transport_edge(current_node, hotel_id)
                    else:
                        # Shared Edge
                        best_edge = best_transport_edges.get((current_node, next_node))
                        if best_edge:
                            edge_params = {
                                "from": current_node,
                                "to": next_node,
                                "mode": best_edge.mode,
                                "duration_min": best_edge.duration_min,
                                "cost": best_edge.cost
                            }

                    if edge_params:
                         # Track totals
                         total_transport_cost += edge_params['cost']
                         total_transport_time += edge_params['duration_min']
                         
                         family_transport.append({
                            'from': current_node,
                            'from_name': self.locations[current_node].name if current_node in self.locations else current_node,
                            'to': next_node,
                            'to_name': self.locations[next_node].name if next_node in self.locations else next_node,
                            'mode': edge_params['mode'],
                            'duration_min': edge_params['duration_min'],
                            'cost': edge_params['cost']
                         })
                    
                    if next_node != END_NODE:
                        path_nodes.append(next_node)
                    
                    current_node = next_node
                else:
                    print(f"ERROR: No outgoing edge found for family {fid} at {current_node}")
                    break
                
                safety_counter += 1
            
            family_pois = path_nodes
            
            total_satisfaction = 0.0
            poi_data = []
            for idx, poi in enumerate(family_pois):
                sat_score = self.calculate_satisfaction(family_obj, self.locations[poi])
                total_satisfaction += sat_score
                
                poi_data.append({
                    'sequence': idx + 1,
                    'location_id': poi,
                    'location_name': self.locations[poi].name,
                    'arrival_time': self._minutes_to_time(solver.Value(arr[(fid, poi)])),
                    'departure_time': self._minutes_to_time(solver.Value(dep[(fid, poi)])),
                    'visit_duration_min': solver.Value(dep[(fid, poi)]) - solver.Value(arr[(fid, poi)]),
                    'satisfaction_score': round(sat_score, 2)
                })
            
            families_data[fid] = {
                'family_id': fid,
                'total_satisfaction': round(total_satisfaction, 2),
                'pois': poi_data,
                'transport': family_transport
            }
        
        # Pull hotel and restaurant data from backbone, keyed by day (1-indexed)
        day_num = day_index + 1
        day_hotel_assignments = {
            fid: next(
                (p for p in self.hotel_assignments.get(fid, []) if p.get("day") == day_num),
                None,
            )
            for fid in family_ids
        }
        # daily_restaurants keys may be int or string depending on JSON parse
        day_restaurant = self.daily_restaurants.get(day_num) or self.daily_restaurants.get(str(day_num), {})

        solution = {
            'day': day_num,
            'objective_value': solver.ObjectiveValue(),
            'solve_time_seconds': solver.WallTime(),
            'shared_poi_order': visited_pois,
            'total_transport_cost': total_transport_cost,
            'total_transport_time_min': total_transport_time,
            'transport': [], # Consolidated transport replaced by family-specific
            'families': families_data,
            'num_families': len(family_ids),
            # Hotel and restaurant data from backbone optimizer
            'hotel_assignments': day_hotel_assignments,
            'restaurant': day_restaurant,
        }
        
        print(f"[OK] Multi-family solution extracted for {len(family_ids)} families")
        
        return solution

    def get_best_transport_edge(self, from_id: str, to_id: str) -> Optional[Dict]:
        """
        Find the best transport edge between two locations based on a cost function.
        If multiple modes exist, picks the one with lowest weighted cost (time + money).
        """
        key = (from_id, to_id)
        edges = self.transport_lookup.get(key, [])
        
        if not edges:
            if from_id in self.locations and to_id in self.locations:
                 return self._create_fallback_transport(from_id, to_id).__dict__
            return None
            
        # Select best edge: minimum (cost + time_in_minutes) approximation
        # Bias towards time (0.1 weight for cost implies 10 Rs ~ 1 min)
        best_edge = min(edges, key=lambda e: e.duration_min + e.cost * 0.1) 
        
        return {
            "from": best_edge.from_loc,
            "to": best_edge.to_loc,
            "mode": best_edge.mode,
            "duration_min": best_edge.duration_min,
            "cost": best_edge.cost,
            "reliability": best_edge.reliability
        }

    def hydrate_itinerary_with_transport(self, base_itinerary: Dict) -> Dict:
        """
        Populate transport details for a fixed itinerary sequence using the loaded transport graph.
        Useful for enriching base itineraries (like base_itinerary_final.json) that lack transport edges.
        
        Args:
            base_itinerary: Dictionary matching the base itinerary structure
            
        Returns:
            New dictionary with 'transport', 'total_transport_cost', and 'total_transport_time_min' populated per day.
        """
        import copy
        enriched_itinerary = copy.deepcopy(base_itinerary)
        
        total_trip_cost = 0
        total_trip_time = 0
        
        for day_data in enriched_itinerary['days']:
            day_idx = day_data['day']
            pois = day_data['pois']
            
            # Determine explicit start/end anchors or default to HOTEL
            start_loc = day_data.get('start_location', 'LOC_HOTEL') 
            end_loc = day_data.get('end_location', 'LOC_HOTEL')
            
            # Construct sequence: Start -> POI1 -> ... -> POIn -> End
            sequence_ids = [start_loc] + [p['location_id'] for p in pois] + [end_loc]
            
            day_transport = []
            day_cost = 0
            day_time = 0
            
            for i in range(len(sequence_ids) - 1):
                from_id = sequence_ids[i]
                to_id = sequence_ids[i+1]
                
                if from_id == to_id:
                    continue
                    
                edge = self.get_best_transport_edge(from_id, to_id)
                
                if edge:
                    # Enrich edge with names for readability
                    edge['from_name'] = self.locations.get(edge['from'], Location('', from_id, '', '', 0.0, 0.0, 0, 0, False, [], 0)).name
                    edge['to_name'] = self.locations.get(edge['to'], Location('', to_id, '', '', 0.0, 0.0, 0, 0, False, [], 0)).name
                    
                    day_transport.append(edge)
                    day_cost += edge['cost']
                    day_time += edge['duration_min']
                else:
                    print(f"Warning: No transport found between {from_id} and {to_id} on Day {day_idx}")
            
            # Update Day Record
            day_data['transport'] = day_transport
            day_data['total_transport_cost'] = day_cost
            day_data['total_transport_time_min'] = day_time
            
            # Propagate to 'families' structure for compatibility with OptimizerAgent results
            families_structure = {}
            for fid in self.family_prefs.keys():
                 families_structure[fid] = {
                    "family_id": fid,
                    "pois": pois, # Shared skeleton
                    "transport": day_transport, # Shared transport
                    "total_transport_cost": day_cost,
                    "total_transport_time_min": day_time
                 }
            day_data['families'] = families_structure
            
            total_trip_cost += day_cost
            total_trip_time += day_time
            
        enriched_itinerary['total_trip_cost'] = total_trip_cost
        enriched_itinerary['total_trip_time_min'] = total_trip_time
        
        return enriched_itinerary