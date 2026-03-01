"""
Itinerary Service

Handles itinerary versioning and retrieval with real database operations.
"""

import logging
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from sqlmodel import Session, select
from app.core.db import engine
from app.models.itinerary import Itinerary
from app.models.family import Family
from app.schemas.itinerary import Itinerary as ItinerarySchema

logger = logging.getLogger(__name__)


class ItineraryService:
    """Service for managing itineraries with versioning."""
    
    @staticmethod
    def get_current_itinerary(family_id: UUID) -> Optional[dict]:
        """
        Get the current itinerary for a family.
        
        Returns the itinerary data as a dictionary.
        """
        with Session(engine) as session:
            # Get the family
            family = session.get(Family, family_id)
            if not family or not family.current_itinerary_version:
                return None
            
            # Get the current itinerary version
            itinerary = session.get(Itinerary, family.current_itinerary_version)
            if not itinerary:
                return None
            
            return itinerary.data
    
    @staticmethod
    def get_itinerary(itinerary_id: UUID) -> Optional[Itinerary]:
        """Get a specific itinerary by ID."""
        with Session(engine) as session:
            return session.get(Itinerary, itinerary_id)
    
    @staticmethod
    def create_itinerary(
        family_id: UUID,
        itinerary_data: dict,
        created_reason: str = "Initial creation",
        created_by: Optional[str] = None,
        set_as_current: bool = True
    ) -> Itinerary:
        """
        Create a new itinerary version.
        
        Args:
            family_id: Family this itinerary belongs to
            itinerary_data: Complete itinerary data as dict
            created_reason: Reason for creation
            created_by: User ID or "system"
            set_as_current: Whether to set this as the current version
            
        Returns:
            Created Itinerary object
        """
        with Session(engine) as session:
            # Get the current max version for this family
            statement = (
                select(Itinerary)
                .where(Itinerary.family_id == family_id)
                .order_by(Itinerary.version.desc())
                .limit(1)
            )
            latest = session.exec(statement).first()
            new_version = (latest.version + 1) if latest else 1
            
            # Calculate statistics from data
            total_cost = itinerary_data.get('total_cost', 0.0)
            total_satisfaction = itinerary_data.get('total_satisfaction', 0.0)
            duration_days = len(itinerary_data.get('days', []))
            
            # Create new itinerary
            itinerary = Itinerary(
                family_id=family_id,
                version=new_version,
                data=itinerary_data,
                created_reason=created_reason,
                created_by=created_by,
                total_cost=total_cost,
                total_satisfaction=total_satisfaction,
                duration_days=duration_days
            )
            
            session.add(itinerary)
            session.commit()
            session.refresh(itinerary)
            
            # Update family's current itinerary if requested
            if set_as_current:
                family = session.get(Family, family_id)
                if family:
                    family.current_itinerary_version = itinerary.id
                    family.updated_at = datetime.utcnow()
                    session.add(family)
                    session.commit()
            
            return itinerary
    
    @staticmethod
    def get_itinerary_history(family_id: UUID, limit: int = 10) -> List[Itinerary]:
        """Get itinerary version history for a family."""
        with Session(engine) as session:
            statement = (
                select(Itinerary)
                .where(Itinerary.family_id == family_id)
                .order_by(Itinerary.version.desc())
                .limit(limit)
            )
            results = session.exec(statement)
            return list(results.all())
    
    @staticmethod
    def get_latest_version(family_id: UUID) -> Optional[Itinerary]:
        """Get the latest itinerary version for a family."""
        with Session(engine) as session:
            statement = (
                select(Itinerary)
                .where(Itinerary.family_id == family_id)
                .order_by(Itinerary.version.desc())
                .limit(1)
            )
            return session.exec(statement).first()

    @staticmethod
    def create_version(family_id: UUID, itinerary_data: dict) -> Itinerary:
        """
        Convenience alias for create_itinerary — creates a new versioned itinerary.

        Used by the optimizer pipeline after re-optimization.

        Args:
            family_id: Family UUID
            itinerary_data: Complete itinerary data dict

        Returns:
            Created Itinerary record
        """
        return ItineraryService.create_itinerary(
            family_id=family_id,
            itinerary_data=itinerary_data,
            created_reason="Re-optimized itinerary",
            created_by="optimizer",
            set_as_current=True,
        )

    @staticmethod
    def publish_base_itinerary(
        trip_id: str,
        family_ids: List[str],
        itinerary_data: dict,
        created_reason: str = "Base itinerary approved by agent",
    ) -> List[UUID]:
        """
        Publish an approved base itinerary to all families in a trip.

        Creates an Itinerary record (version 1) for each family and updates
        Family.current_itinerary_version so the customer-facing page sees it.

        Args:
            trip_id: Trip identifier
            family_ids: List of family_code strings
            itinerary_data: The approved itinerary JSON data
            created_reason: Reason string for the itinerary record

        Returns:
            List of created Itinerary UUIDs
        """
        created_ids: List[UUID] = []

        with Session(engine) as session:
            for fam_code in family_ids:
                # Look up family by family_code
                statement = select(Family).where(Family.family_code == fam_code)
                family = session.exec(statement).first()

                if not family:
                    logger.warning(
                        f"Family {fam_code} not found in DB, skipping publish"
                    )
                    continue

                # Calculate stats
                total_cost = itinerary_data.get("total_cost", 0.0)
                total_satisfaction = itinerary_data.get("total_satisfaction", 0.0)
                duration_days = len(itinerary_data.get("days", []))

                # Create Itinerary record
                itinerary = Itinerary(
                    family_id=family.id,
                    version=1,
                    data=itinerary_data,
                    created_reason=created_reason,
                    created_by="agent",
                    total_cost=total_cost,
                    total_satisfaction=total_satisfaction,
                    duration_days=duration_days,
                )
                session.add(itinerary)
                session.flush()

                # Point family to this version
                family.current_itinerary_version = itinerary.id
                family.trip_name = trip_id
                family.updated_at = datetime.utcnow()
                session.add(family)

                created_ids.append(itinerary.id)

            session.commit()

        logger.info(
            f"Published base itinerary for trip {trip_id} to "
            f"{len(created_ids)} families"
        )
        return created_ids

    @staticmethod
    def diff_itineraries(family_id: UUID, version_a: int, version_b: int) -> dict:
        """
        Compute a structured diff between two itinerary versions.

        Returns a dict compatible with ItineraryDiffResponse schema.
        """
        with Session(engine) as session:
            # Get both versions
            stmt_a = (
                select(Itinerary)
                .where(Itinerary.family_id == family_id, Itinerary.version == version_a)
            )
            stmt_b = (
                select(Itinerary)
                .where(Itinerary.family_id == family_id, Itinerary.version == version_b)
            )
            itin_a = session.exec(stmt_a).first()
            itin_b = session.exec(stmt_b).first()

            if not itin_a or not itin_b:
                return None

            data_a = itin_a.data or {}
            data_b = itin_b.data or {}

            days_a = {d.get("day", i): d for i, d in enumerate(data_a.get("days", []))}
            days_b = {d.get("day", i): d for i, d in enumerate(data_b.get("days", []))}

            all_days = sorted(set(list(days_a.keys()) + list(days_b.keys())))

            day_changes = []
            total_added = 0
            total_removed = 0
            total_modified = 0

            for day_num in all_days:
                day_a = days_a.get(day_num)
                day_b = days_b.get(day_num)

                if day_a and not day_b:
                    # Day removed
                    pois_a = day_a.get("pois", [])
                    total_removed += len(pois_a)
                    day_changes.append({
                        "day": day_num,
                        "change_type": "removed",
                        "poi_changes": [
                            {
                                "poi_id": p.get("poi_id", ""),
                                "poi_name": p.get("name", ""),
                                "change_type": "removed",
                                "day": day_num,
                                "old_values": p,
                                "new_values": {},
                            }
                            for p in pois_a
                        ],
                    })
                elif day_b and not day_a:
                    # Day added
                    pois_b = day_b.get("pois", [])
                    total_added += len(pois_b)
                    day_changes.append({
                        "day": day_num,
                        "change_type": "added",
                        "poi_changes": [
                            {
                                "poi_id": p.get("poi_id", ""),
                                "poi_name": p.get("name", ""),
                                "change_type": "added",
                                "day": day_num,
                                "old_values": {},
                                "new_values": p,
                            }
                            for p in pois_b
                        ],
                    })
                else:
                    # Day exists in both — compare POIs
                    pois_a = {p.get("poi_id", f"idx_{i}"): p for i, p in enumerate(day_a.get("pois", []))}
                    pois_b = {p.get("poi_id", f"idx_{i}"): p for i, p in enumerate(day_b.get("pois", []))}

                    poi_changes = []
                    for pid in set(list(pois_a.keys()) + list(pois_b.keys())):
                        pa = pois_a.get(pid)
                        pb = pois_b.get(pid)

                        if pa and not pb:
                            poi_changes.append({
                                "poi_id": pid,
                                "poi_name": pa.get("name", ""),
                                "change_type": "removed",
                                "day": day_num,
                                "old_values": pa,
                                "new_values": {},
                            })
                            total_removed += 1
                        elif pb and not pa:
                            poi_changes.append({
                                "poi_id": pid,
                                "poi_name": pb.get("name", ""),
                                "change_type": "added",
                                "day": day_num,
                                "old_values": {},
                                "new_values": pb,
                            })
                            total_added += 1
                        elif pa != pb:
                            poi_changes.append({
                                "poi_id": pid,
                                "poi_name": pb.get("name", pa.get("name", "")),
                                "change_type": "modified",
                                "day": day_num,
                                "old_values": pa,
                                "new_values": pb,
                            })
                            total_modified += 1

                    if poi_changes:
                        day_changes.append({
                            "day": day_num,
                            "change_type": "modified",
                            "poi_changes": poi_changes,
                        })

            # Cost diff
            old_cost = data_a.get("total_cost", itin_a.total_cost or 0.0)
            new_cost = data_b.get("total_cost", itin_b.total_cost or 0.0)
            cost_delta = new_cost - old_cost
            cost_pct = (cost_delta / old_cost * 100) if old_cost else 0.0

            # Satisfaction diff
            old_sat = data_a.get("total_satisfaction", itin_a.total_satisfaction or 0.0)
            new_sat = data_b.get("total_satisfaction", itin_b.total_satisfaction or 0.0)
            sat_delta = new_sat - old_sat

            # Summary
            parts = []
            if total_added:
                parts.append(f"{total_added} POI(s) added")
            if total_removed:
                parts.append(f"{total_removed} POI(s) removed")
            if total_modified:
                parts.append(f"{total_modified} POI(s) modified")
            if cost_delta:
                parts.append(f"cost {'increased' if cost_delta > 0 else 'decreased'} by {abs(cost_delta):.0f}")
            summary = "; ".join(parts) if parts else "No changes detected"

            return {
                "family_id": str(family_id),
                "version_a": version_a,
                "version_b": version_b,
                "day_changes": day_changes,
                "cost_diff": {
                    "old_cost": old_cost,
                    "new_cost": new_cost,
                    "delta": cost_delta,
                    "percent_change": round(cost_pct, 2),
                },
                "satisfaction_diff": {
                    "old_satisfaction": old_sat,
                    "new_satisfaction": new_sat,
                    "delta": sat_delta,
                },
                "total_pois_added": total_added,
                "total_pois_removed": total_removed,
                "total_pois_modified": total_modified,
                "summary": summary,
            }

