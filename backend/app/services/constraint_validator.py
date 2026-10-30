from typing import List, Dict, Any
from app.contracts.optimization import OptimizationRequest, ValidationResult

class ConstraintValidator:
    """
    Validates an OptimizationRequest BEFORE executing the heavy CP-SAT solver.
    Returns a ValidationResult instead of throwing exceptions.
    """

    @staticmethod
    def validate(request: OptimizationRequest) -> ValidationResult:
        errors = []
        warnings = []
        feasibility_score = 1.0

        # 1. Basic Consistency Checks
        if not request.trip_id:
            errors.append("OptimizationRequest is missing trip_id.")
        if not request.family_ids:
            errors.append("OptimizationRequest is missing family_ids.")
        if request.num_days <= 0:
            errors.append(f"Invalid num_days: {request.num_days}.")

        dataset = request.dataset
        constraints = request.constraints

        # 2. Dataset Integrity
        if not dataset.locations:
            errors.append("Dataset has no locations (POIs).")
        if not dataset.hotels:
            warnings.append("Dataset has no hotels. Depending on base itinerary, this may fail.")
            feasibility_score -= 0.1
        if not dataset.base_itinerary.days:
            errors.append("Base itinerary has no days defined.")
        
        # Check all family preferences are loaded
        for fam_id in request.family_ids:
            if fam_id not in dataset.family_preferences:
                errors.append(f"Missing base preferences for family: {fam_id}")

        # 3. Transport Graph Completeness
        if not dataset.transport_edges:
            errors.append("Transport graph is completely empty.")
        else:
            # Check graph connectivity - simple check: do all must_visit locations appear in the graph?
            graph_nodes = set()
            for edge in dataset.transport_edges:
                graph_nodes.add(edge.from_location)
                graph_nodes.add(edge.to_location)
            
            missing_must_visit = [poi for poi in constraints.must_visit if poi not in graph_nodes]
            if missing_must_visit:
                errors.append(f"The following must_visit POIs are disconnected from the transport graph: {missing_must_visit}")
                
            missing_locations = [loc for loc in dataset.locations.keys() if loc not in graph_nodes]
            if len(missing_locations) > len(dataset.locations) * 0.5:
                warnings.append("More than 50% of locations are missing from the transport graph.")
                feasibility_score -= 0.2

        # 4. Conflicting Hard Constraints
        conflict = set(constraints.must_visit).intersection(set(constraints.never_visit))
        if conflict:
            errors.append(f"Conflicting hard constraints. POIs in both must_visit and never_visit: {conflict}")

        # 5. Invalid/Unknown POIs in Constraints
        for poi in constraints.must_visit:
            if poi not in dataset.locations:
                errors.append(f"must_visit POI '{poi}' is not found in the dataset locations.")
        for poi in constraints.never_visit:
            if poi not in dataset.locations:
                warnings.append(f"never_visit POI '{poi}' is not found in the dataset locations (ignoring).")

        # 6. Impossible Schedules (Time check)
        total_must_visit_time = 0
        for poi in constraints.must_visit:
            if poi in dataset.locations:
                total_must_visit_time += dataset.locations[poi].visit_duration_min or 0
                
        # Estimate total available time (e.g. 10 hours * 60 mins = 600 mins per day)
        assumed_daily_minutes = 10 * 60
        total_available_time = request.num_days * assumed_daily_minutes
        
        if total_must_visit_time > total_available_time:
            errors.append(f"Impossible schedule: must_visit POIs require {total_must_visit_time}m, but only ~{total_available_time}m is available across {request.num_days} days.")
            feasibility_score = 0.0
        elif total_must_visit_time > total_available_time * 0.8:
            warnings.append("Extremely dense itinerary requested. Optimization may fail or drop soft constraints.")
            feasibility_score -= 0.3

        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            feasibility_score=max(0.0, feasibility_score)
        )
