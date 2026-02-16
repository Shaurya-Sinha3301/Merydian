    
    # ========================================================================
    # TRANSPORT DISRUPTION MANAGEMENT (NEW)
    # ========================================================================
    
    def add_disruption(
        self,
        trip_id: str,
        disruption: TransportDisruption
    ) -> None:
        """Record a transport disruption for this trip"""
        session = self.get_session(trip_id)
        if not session:
            raise ValueError(f"No session found for trip_id: {trip_id}")
        
        session.active_disruptions.append(disruption)
        self._save_session(session)
        
        logger.info(f"Disruption added: {disruption.disruption_id}")
        logger.info(f" - Reason: {disruption.reason}")
        logger.info(f" - Severity: {disruption.severity}")
    
    def get_active_disruptions(
        self,
        trip_id: str,
        current_day: Optional[int] = None,
        current_time: Optional[datetime] = None
    ) -> List[TransportDisruption]:
        """Get currently active disruptions (time-filtered)"""
        session = self.get_session(trip_id)
        if not session:
            return []
        
        active = []
        for d in session.active_disruptions:
            if not d.active:
                continue
            
            # Check time bounds
            if current_time:
                if d.start_time and current_time < d.start_time:
                    continue
                if d.end_time and current_time > d.end_time:
                    continue
            
            # Check day bounds
            if current_day is not None:
                if d.start_day is not None and current_day < d.start_day:
                    continue
                if d.end_day is not None and current_day > d.end_day:
                    continue
            
            active.append(d)
        
        return active
    
    def clear_expired_disruptions(self, trip_id: str) -> int:
        """Remove expired disruptions, return count removed"""
        session = self.get_session(trip_id)
        if not session:
            return 0
        
        now = datetime.now()
        original_count = len(session.active_disruptions)
        
        session.active_disruptions = [
            d for d in session.active_disruptions
            if d.end_time is None or d.end_time > now
        ]
        
        removed = original_count - len(session.active_disruptions)
        if removed > 0:
            self._save_session(session)
            logger.info(f"Cleared {removed} expired disruptions")
        
        return removed
    
    def update_transport_availability(
        self,
        trip_id: str,
        transport_graph_path: str,
        output_path: str
    ) -> str:
        """
        Update transport graph with availability flags based on active disruptions.
        
        In production: This would be a database UPDATE query instead of file rewrite.
        
        Returns: Path to updated transport graph
        """
        session = self.get_session(trip_id)
        if not session:
            return transport_graph_path
        
        # Get active disruptions
        disruptions = self.get_active_disruptions(
            trip_id,
            current_day=session.current_day,
            current_time=datetime.now() if session.current_time_minutes else None
        )
        
        if not disruptions:
            # No disruptions - ensure all edges are available
            return self._ensure_all_available(transport_graph_path, output_path)
        
        # Load transport graph
        with open(transport_graph_path, 'r', encoding='utf-8') as f:
            graph = json.load(f)
        
        # Update availability flags
        unavailable_count = 0
        for edge in graph:
            # Initialize 'available' field if missing (backward compatibility)
            if 'available' not in edge:
                edge['available'] = True
            
            # Check if edge is disrupted
            if self._is_edge_disrupted(edge, disruptions):
                if edge['available']:  # Only count if changing
                    unavailable_count += 1
                edge['available'] = False
            else:
                edge['available'] = True  # Restore if disruption expired
        
        # Save updated graph
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(graph, f, indent=2)
        
        logger.info(f"Updated transport availability: {unavailable_count} edges marked unavailable")
        logger.info(f"  Active disruptions: {len(disruptions)}")
        logger.info(f"  Saved to: {output_path}")
        
        return output_path
    
    def _ensure_all_available(self, input_path: str, output_path: str) -> str:
        """Set all edges to available=true (disruptions cleared)"""
        with open(input_path, 'r', encoding='utf-8') as f:
            graph = json.load(f)
        
        for edge in graph:
            edge['available'] = True
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(graph, f, indent=2)
        
        return output_path
    
    def _is_edge_disrupted(
        self,
        edge: Dict[str, Any],
        disruptions: List[TransportDisruption]
    ) -> bool:
        """Check if an edge is affected by any active disruption"""
        for d in disruptions:
            # Check by edge ID
            if d.affected_edges and edge['edge_id'] in d.affected_edges:
                return True
            
            # Check by mode
            if d.affected_modes and edge['mode'] in d.affected_modes:
                return True
            
            # Check by locations
            if d.affected_locations:
                from_loc, to_loc = d.affected_locations
                if (from_loc == "*" or from_loc == edge['from']) and \
                   (to_loc == "*" or to_loc == edge['to']):
                    return True
        
        return False
