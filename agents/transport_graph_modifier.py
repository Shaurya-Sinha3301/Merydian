"""
Transport Graph Modifier - Utility for applying transport disruptions to graphs.

Extracted from TripSessionManager for use in agents framework.
Creates modified transport graphs that mark specific routes/modes as unavailable.
"""
import json
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class TransportDisruption:
    """Represents a transport disruption that marks edges as unavailable"""
    disruption_id: str
    
    # What's affected (at least one must be specified)
    affected_modes: Optional[List[str]] = None  # e.g., ["METRO"]
    affected_from_poi: Optional[str] = None  # Specific route: from POI
    affected_to_poi: Optional[str] = None  # Specific route: to POI
    
    # Metadata
    reason: str = "USER_REPORTED"
    severity: str = "SEVERE"
    active: bool = True
    reported_at: datetime = None
    
    def __post_init__(self):
        if self.reported_at is None:
            self.reported_at = datetime.now()


class TransportGraphModifier:
    """
    Modifies transport graphs to reflect disruptions.
    
    Usage:
        modifier = TransportGraphModifier()
        
        # Global METRO disruption
        disruption = TransportDisruption(
            disruption_id="METRO_STRIKE",
            affected_modes=["METRO"]
        )
        modified_path = modifier.apply_disruption(
            transport_graph_path="data/transport_graph.json",
            disruption=disruption,
            output_path="temp/transport_metro_down.json"
        )
        
        # Route-specific BUS disruption
        disruption = TransportDisruption(
            disruption_id="BUS_ROUTE_CLOSED",
            affected_modes=["BUS"],
            affected_from_poi="LOC_001",
            affected_to_poi="LOC_003"
        )
    """
    
    def apply_disruption(
        self,
        transport_graph_path: str,
        disruption: TransportDisruption,
        output_path: Optional[str] = None
    ) -> str:
        """
        Apply a transport disruption to a transport graph.
        
        Args:
            transport_graph_path: Path to original transport graph JSON
            disruption: TransportDisruption object describing what's affected
            output_path: Where to save the modified graph (optional)
        
        Returns:
            Path to the modified transport graph file
        """
        # Load original graph
        with open(transport_graph_path, 'r', encoding='utf-8') as f:
            graph = json.load(f)
        
        edges_affected = 0
        
        # Determine disruption type
        is_global_mode = (
            disruption.affected_modes and 
            not disruption.affected_from_poi and 
            not disruption.affected_to_poi
        )
        
        is_route_specific = (
            disruption.affected_modes and
            disruption.affected_from_poi and
            disruption.affected_to_poi
        )
        
        # Apply disruption
        for edge in graph:
            if is_global_mode:
                # Global mode disruption: mark all edges of this mode unavailable
                if edge.get("mode") in disruption.affected_modes:
                    edge["available"] = False
                    if "disruption_reason" not in edge:
                        edge["disruption_reason"] = disruption.reason
                    edges_affected += 1
            
            elif is_route_specific:
                # Route-specific disruption: only specific route
                mode_match = edge.get("mode") in disruption.affected_modes
                route_match = (
                    (edge.get("from") == disruption.affected_from_poi and 
                     edge.get("to") == disruption.affected_to_poi) or
                    (edge.get("from") == disruption.affected_to_poi and 
                     edge.get("to") == disruption.affected_from_poi)  # Bidirectional
                )
                
                if mode_match and route_match:
                    edge["available"] = False
                    if "disruption_reason" not in edge:
                        edge["disruption_reason"] = disruption.reason
                    edges_affected += 1
        
        # Determine output path
        if not output_path:
            mode_str = "_".join(disruption.affected_modes) if disruption.affected_modes else "unknown"
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = str(Path(transport_graph_path).parent / 
                            f"transport_{mode_str}_disrupted_{timestamp}.json")
        
        # Save modified graph
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(graph, f, indent=2)
        
        logger.info(f"Applied {disruption.disruption_id}: {edges_affected} edges marked unavailable")
        logger.info(f"Modified transport graph saved to: {output_path}")
        
        return str(output_path)
    
    def apply_disruption_from_dict(
        self,
        transport_graph_path: str,
        disruption_dict: Dict[str, Any],
        output_path: Optional[str] = None
    ) -> str:
        """
        Apply disruption from a dictionary (e.g., from event preferences).
        
        Args:
            transport_graph_path: Path to original transport graph
            disruption_dict: Dict with keys: transport_mode, disruption_from_poi, disruption_to_poi
            output_path: Where to save modified graph
        
        Returns:
            Path to modified graph
        """
        # Extract disruption info from dict
        transport_mode = disruption_dict.get("transport_mode")
        from_poi = disruption_dict.get("disruption_from_poi")
        to_poi = disruption_dict.get("disruption_to_poi")
        
        if not transport_mode:
            raise ValueError("transport_mode must be specified in disruption_dict")
        
        # Create disruption object
        disruption = TransportDisruption(
            disruption_id=f"{transport_mode}_DISRUPTION",
            affected_modes=[transport_mode],
            affected_from_poi=from_poi,
            affected_to_poi=to_poi,
            reason="USER_REPORTED",
            severity="SEVERE"
        )
        
        return self.apply_disruption(transport_graph_path, disruption, output_path)


# Convenience function for agents
def create_disrupted_transport_graph(
    transport_graph_path: str,
    transport_mode: str,
    from_poi: Optional[str] = None,
    to_poi: Optional[str] = None,
    output_dir: Optional[str] = None
) -> str:
    """
    Convenience function to create a disrupted transport graph.
    
    Args:
        transport_graph_path: Path to original transport graph
        transport_mode: Transport mode to disrupt (e.g., "METRO", "BUS")
        from_poi: Optional - starting POI for route-specific disruption
        to_poi: Optional - ending POI for route-specific disruption
        output_dir: Optional - directory to save modified graph
    
    Returns:
        Path to the modified transport graph
    
    Example:
        # Global METRO disruption
        graph_path = create_disrupted_transport_graph(
            "ml_or/data/transport_graph.json",
            "METRO"
        )
        
        # Route-specific BUS disruption
        graph_path = create_disrupted_transport_graph(
            "ml_or/data/transport_graph.json",
            "BUS",
            from_poi="LOC_001",
            to_poi="LOC_003"
        )
    """
    modifier = TransportGraphModifier()
    
    disruption = TransportDisruption(
        disruption_id=f"{transport_mode}_DISRUPTION_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        affected_modes=[transport_mode],
        affected_from_poi=from_poi,
        affected_to_poi=to_poi
    )
    
    # Determine output path
    if output_dir:
        output_path = Path(output_dir) / f"transport_{transport_mode}_disrupted.json"
    else:
        output_path = None
    
    return modifier.apply_disruption(transport_graph_path, disruption, str(output_path) if output_path else None)
