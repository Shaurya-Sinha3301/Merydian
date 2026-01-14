    def optimize_multi_family_single_day(
        self,
        family_ids: List[str] = ["FAM_001", "FAM_002"],
        day_index: int = 0,
        max_pois: int = 3,
        time_limit_seconds: int = 60,
        lambda_divergence: float = 0.5
    ) -> Optional[Dict]:
        """
        STEP 9A: Optimize itinerary for MULTIPLE families, 1 day, shared POI set.
        
        Key Design:
        - SHARED: POI set, transport graph, ordering variables y[i,j], flow constraints
        - FAMILY-SPECIFIC: Visit decisions x[f,i], times arr[f,i]/dep[f,i], satisfaction
        - COHERENCE: Explicit penalties for family divergence
        """
        families = {fid: self.family_prefs[fid] for fid in family_ids}
        day_data = self.base_itinerary['days'][day_index]
        assumptions = self.base_itinerary['assumptions']
        
        day_start_min = self._time_to_minutes(assumptions['day_start_time'])
        day_end_min = self._time_to_minutes(assumptions['day_end_time'])
        
        base_pois = [poi['location_id'] for poi in day_data['pois'][:max_pois]]
        candidate_pois = base_pois[:max_pois]
        
        if not candidate_pois:
            return None
        
        model = cp_model.CpModel()
        
        START_NODE = f"START_DAY_{day_index + 1}"
        END_NODE = f"END_DAY_{day_index + 1}"
        all_nodes = [START_NODE] + candidate_pois + [END_NODE]
        
        # SHARED: Ordering variables y[i,j]
        y = {}
        for i in all_nodes:
            for j in all_nodes:
                if i != j and j != START_NODE and i != END_NODE:
                    y[(i, j)] = model.NewBoolVar(f'order_{i}_before_{j}')
        
        # FAMILY-SPECIFIC: Visit decisions x[f,i]
        x = {}
        for fid in family_ids:
            for poi in candidate_pois:
                x[(fid, poi)] = model.NewBoolVar(f'visit_{fid}_{poi}')
                model.Add(x[(fid, poi)] == 1)
        
        # FAMILY-SPECIFIC: Arrival and departure times
        arr = {}
        dep = {}
        for fid in family_ids:
            for poi in candidate_pois:
                arr[(fid, poi)] = model.NewIntVar(day_start_min, day_end_min, f'arr_{fid}_{poi}')
                dep[(fid, poi)] = model.NewIntVar(day_start_min, day_end_min, f'dep_{fid}_{poi}')
        
        for fid in family_ids:
            arr[(fid, START_NODE)] = day_start_min
            dep[(fid, START_NODE)] = day_start_min
            arr[(fid, END_NODE)] = day_end_min
            dep[(fid, END_NODE)] = day_end_min
        
        # SHARED: Transport variables
        z = {}
        transport_modes = {}
        
        for i in all_nodes:
            for j in all_nodes:
                if i == j or j == START_NODE or i == END_NODE:
                    continue
                
                key = (i, j)
                
                if i == START_NODE or j == END_NODE:
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
                    if key in self.transport_lookup:
                        transport_modes[key] = self.transport_lookup[key].copy()
                    else:
                        transport_modes[key] = []
                    
                    fallback_edge = self._create_fallback_transport(i, j)
                    transport_modes[key].append(fallback_edge)
                
                for edge in transport_modes[key]:
                    z[(i, j, edge.mode, edge.edge_id)] = model.NewBoolVar(
                        f'transport_{i}_{j}_{edge.mode}_{edge.edge_id}'
                    )
        
        # CONSTRAINTS
        
        # 1. FAMILY-SPECIFIC: Departure = Arrival + Visit Time
        for fid in family_ids:
            for poi in candidate_pois:
                visit_time = self.locations[poi].avg_visit_time_min
                model.Add(dep[(fid, poi)] == arr[(fid, poi)] + visit_time)
        
        # 2. SHARED: Flow constraints
        for poi in candidate_pois:
            incoming = [y[(i, poi)] for i in all_nodes if i != poi and (i, poi) in y]
            if incoming:
                model.Add(sum(incoming) <= 1)
            
            outgoing = [y[(poi, j)] for j in all_nodes if j != poi and (poi, j) in y]
            if outgoing:
                model.Add(sum(outgoing) <= 1)
        
        start_outgoing = [y[(START_NODE, j)] for j in candidate_pois if (START_NODE, j) in y]
        if start_outgoing:
            model.Add(sum(start_outgoing) == 1)
        
        end_incoming = [y[(i, END_NODE)] for i in candidate_pois if (i, END_NODE) in y]
        if end_incoming:
            model.Add(sum(end_incoming) == 1)
        
        # 3. SHARED: Bind transport to ordering
        for i in all_nodes:
            for j in all_nodes:
                if i == j or j == START_NODE or i == END_NODE:
                    continue
                
                key = (i, j)
                if key in transport_modes and (i, j) in y:
                    transport_vars = [z[(i, j, edge.mode, edge.edge_id)] for edge in transport_modes[key]]
                    model.Add(sum(transport_vars) == 1).OnlyEnforceIf(y[(i, j)])
                    model.Add(sum(transport_vars) == 0).OnlyEnforceIf(y[(i, j)].Not())
        
        # 4. FAMILY-SPECIFIC: Time chaining
        for fid in family_ids:
            for i in all_nodes:
                for j in all_nodes:
                    if i == j or j == START_NODE or i == END_NODE:
                        continue
                    
                    if (i, j) not in y:
                        continue
                    
                    key = (i, j)
                    if key in transport_modes:
                        for edge in transport_modes[key]:
                            if (i, j, edge.mode, edge.edge_id) in z:
                                if edge.mode == "LOGICAL":
                                    continue
                                
                                if i in candidate_pois and j in candidate_pois:
                                    model.Add(
                                        arr[(fid, j)] >= dep[(fid, i)] + edge.duration_min
                                    ).OnlyEnforceIf(z[(i, j, edge.mode, edge.edge_id)])
                                elif i == START_NODE and j in candidate_pois:
                                    model.Add(
                                        arr[(fid, j)] >= day_start_min
                                    ).OnlyEnforceIf(z[(i, j, edge.mode, edge.edge_id)])
                                elif i in candidate_pois and j == END_NODE:
                                    model.Add(
                                        dep[(fid, i)] <= day_end_min
                                    ).OnlyEnforceIf(z[(i, j, edge.mode, edge.edge_id)])
        
        # 5. FAMILY-SPECIFIC: POI visit edges
        for fid in family_ids:
            for poi in candidate_pois:
                incoming = [y[(i, poi)] for i in all_nodes if i != poi and (i, poi) in y]
                outgoing = [y[(poi, j)] for j in all_nodes if j != poi and (poi, j) in y]
                
                if incoming and outgoing:
                    model.Add(sum(incoming) == 1).OnlyEnforceIf(x[(fid, poi)])
                    model.Add(sum(outgoing) == 1).OnlyEnforceIf(x[(fid, poi)])
                    model.Add(sum(incoming) == 0).OnlyEnforceIf(x[(fid, poi)].Not())
                    model.Add(sum(outgoing) == 0).OnlyEnforceIf(x[(fid, poi)].Not())
        
        # 6. FAMILY-SPECIFIC: Time bounds
        for fid in family_ids:
            for poi in candidate_pois:
                model.Add(arr[(fid, poi)] >= day_start_min)
                model.Add(dep[(fid, poi)] <= day_end_min)
        
        # OBJECTIVE
        
        satisfaction_terms = {}
        for fid in family_ids:
            family = families[fid]
            total_sat = 0.0
            for poi in candidate_pois:
                sat_score = self.calculate_satisfaction(family, self.locations[poi])
                total_sat += sat_score
            satisfaction_terms[fid] = int(total_sat * 100)
        
        total_satisfaction = sum(satisfaction_terms.values())
        
        cost_terms = []
        time_terms = []
        
        for i in all_nodes:
            for j in all_nodes:
                if i == j or j == START_NODE or i == END_NODE:
                    continue
                
                key = (i, j)
                if key in transport_modes:
                    for edge in transport_modes[key]:
                        if edge.mode == "LOGICAL":
                            continue
                        
                        cost_int = int(edge.cost)
                        time_int = edge.duration_min
                        
                        if (i, j, edge.mode, edge.edge_id) in z:
                            cost_terms.append(cost_int * z[(i, j, edge.mode, edge.edge_id)])
                            time_terms.append(time_int * z[(i, j, edge.mode, edge.edge_id)])
        
        total_cost = sum(cost_terms) if cost_terms else 0
        total_time = sum(time_terms) if time_terms else 0
        
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
        
        alpha = 1
        beta = 1
        gamma = 1
        delta = int(lambda_divergence * 100)
        
        coherence_loss = alpha * total_time + beta * total_cost + gamma * total_order_deviation + delta * total_divergence
        
        lambda_coherence = 30
        objective = total_satisfaction - lambda_coherence * coherence_loss
        
        model.Maximize(objective)
        
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = time_limit_seconds
        solver.parameters.log_search_progress = True
        
        status = solver.Solve(model)
        
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            return self._extract_multi_family_solution(
                solver, x, y, z, arr, dep,
                candidate_pois, transport_modes, family_ids, day_index, all_nodes
            )
        else:
            print(f"No feasible solution found. Status: {solver.StatusName(status)}")
            return None
    
    def _extract_multi_family_solution(
        self,
        solver: cp_model.CpSolver,
        x: Dict,
        y: Dict,
        z: Dict,
        arr: Dict,
        dep: Dict,
        candidate_pois: List[str],
        transport_modes: Dict,
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
                                'cost': edge.cost
                            })
                            break
        
        families_data = {}
        for fid in family_ids:
            family_obj = self.family_prefs[fid]
            
            family_pois = [poi for poi in visited_pois if solver.Value(x[(fid, poi)]) == 1]
            
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
                'pois': poi_data
            }
        
        total_transport_cost = sum(t['cost'] for t in transport_plan)
        total_transport_time = sum(t['duration_min'] for t in transport_plan)
        
        solution = {
            'day': day_index + 1,
            'objective_value': solver.ObjectiveValue(),
            'solve_time_seconds': solver.WallTime(),
            'shared_poi_order': visited_pois,
            'total_transport_cost': total_transport_cost,
            'total_transport_time_min': total_transport_time,
            'transport': transport_plan,
            'families': families_data,
            'num_families': len(family_ids)
        }
        
        print(f"[OK] Multi-family solution extracted for {len(family_ids)} families")
        
        return solution

