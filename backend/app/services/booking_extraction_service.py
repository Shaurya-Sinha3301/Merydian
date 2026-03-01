"""
Booking Extraction Service

Extracts bookable items (transport, hotels, dining) from optimizer output files:
  - optimized_backbone.json  → hotel_assignments, daily_restaurants
  - optimized_itinerary.json → CAB / CAB_FALLBACK transport, restaurant POI names & times
"""

from datetime import datetime, timedelta
from typing import Any
import logging

logger = logging.getLogger(__name__)


class BookingExtractionService:
    """Extracts a booking manifest from optimizer output files."""

    @staticmethod
    def extract(
        itinerary: dict,
        backbone: dict,
        start_date: str,
    ) -> dict:
        """
        Build a day-grouped booking manifest.

        Args:
            itinerary: parsed optimized_itinerary.json
            backbone:  parsed optimized_backbone.json
            start_date: trip start date as ISO string (YYYY-MM-DD)

        Returns:
            {
              "trip_id": "...",
              "families": ["3D961024", ...],
              "days": [ { day, title, date, time_range, rows[], day_cost } ],
              "total_cost": float
            }
        """
        try:
            base_date = datetime.fromisoformat(start_date)
        except Exception:
            base_date = datetime.now()

        families = itinerary.get("families", [])
        days_data = itinerary.get("days", [])
        hotel_assignments = backbone.get("hotel_assignments", {})
        daily_restaurants = backbone.get("daily_restaurants", {})

        all_days = []
        grand_total = 0.0

        for day_obj in days_data:
            day_num = day_obj["day"]
            day_date = base_date + timedelta(days=day_num - 1)
            day_date_label = day_date.strftime("%b %d").upper()

            rows = []
            day_cost = 0.0
            row_counter = 0

            # ── 1. Hotels (from backbone) ───────────────────────────────
            hotels_for_day = BookingExtractionService._extract_hotels(
                hotel_assignments, day_num
            )
            for hotel in hotels_for_day:
                row_counter += 1
                cost = hotel["cost"]
                day_cost += cost
                nights_hint = "1 Night"
                rows.append({
                    "id": f"htl-d{day_num}-{row_counter}",
                    "type": "stay",
                    "status": "pending",
                    "title": hotel["hotel_name"],
                    "description": f'{hotel["hotel_id"]}',
                    "date": day_date_label,
                    "time": None,
                    "price": cost,
                    "ref_id": hotel["hotel_id"],
                    "meta_secondary": nights_hint,
                    "families": hotel["families"],
                })

            # ── 2. Dining (backbone + itinerary for names/times) ────────
            restaurant_info = daily_restaurants.get(str(day_num), {})
            dining_rows = BookingExtractionService._extract_dining(
                restaurant_info, day_obj, day_num, day_date_label
            )
            for d_row in dining_rows:
                row_counter += 1
                d_row["id"] = f"din-d{day_num}-{row_counter}"
                day_cost += d_row.get("price", 0)
                rows.append(d_row)

            # ── 3. Transport — CAB / CAB_FALLBACK only (from itinerary) ─
            transport_rows = BookingExtractionService._extract_cab_transport(
                day_obj, day_num, day_date_label
            )
            for t_row in transport_rows:
                row_counter += 1
                t_row["id"] = f"cab-d{day_num}-{row_counter}"
                day_cost += t_row.get("price", 0)
                rows.append(t_row)

            # Build earliest / latest times for the time_range
            times = []
            for r in rows:
                if r.get("time"):
                    times.append(r["time"])
            if times:
                time_range = f"{min(times)} – {max(times)}"
            else:
                time_range = ""

            all_days.append({
                "day": day_num,
                "title": f"Day {day_num}",
                "date": day_date_label,
                "time_range": time_range,
                "rows": rows,
                "day_cost": round(day_cost, 2),
            })
            grand_total += day_cost

        return {
            "trip_id": itinerary.get("trip_id", ""),
            "families": families,
            "days": all_days,
            "total_cost": round(grand_total, 2),
        }

    # ─── Helpers ────────────────────────────────────────────────────────────

    @staticmethod
    def _extract_hotels(hotel_assignments: dict, day_num: int) -> list[dict]:
        """
        Group families that share the same hotel on a given day into one row.
        Returns list of { hotel_id, hotel_name, cost, families: [fam_id, ...] }
        """
        hotel_map: dict[str, dict] = {}

        for family_id, assignments in hotel_assignments.items():
            for entry in assignments:
                if entry["day"] != day_num:
                    continue
                hid = entry["hotel_id"]
                if hid not in hotel_map:
                    hotel_map[hid] = {
                        "hotel_id": hid,
                        "hotel_name": entry["hotel_name"],
                        "cost": entry["cost"],
                        "families": [],
                    }
                hotel_map[hid]["families"].append(family_id)
                # Use max cost (they should be identical but just in case)
                hotel_map[hid]["cost"] = max(hotel_map[hid]["cost"], entry["cost"])

        return list(hotel_map.values())

    @staticmethod
    def _extract_dining(
        restaurant_info: dict,
        day_obj: dict,
        day_num: int,
        day_date_label: str,
    ) -> list[dict]:
        """
        Resolve restaurant entries from backbone IDs + itinerary POI details.
        """
        rows = []
        families_data = day_obj.get("families", {})

        for meal_type, loc_id in restaurant_info.items():
            # e.g. meal_type = "dinner", loc_id = "LOC_046"
            # Find the POI in any family's pois list that matches LOC_046_DINNER
            poi_suffix = f"_{meal_type.upper()}"
            target_poi_id = f"{loc_id}{poi_suffix}"

            poi_name = f"{loc_id} ({meal_type.capitalize()})"
            arrival_time = None
            departure_time = None
            participating_families = []

            for fam_id, fam_data in families_data.items():
                for poi in fam_data.get("pois", []):
                    if poi["location_id"] == target_poi_id:
                        poi_name = poi["location_name"]
                        arrival_time = poi.get("arrival_time")
                        departure_time = poi.get("departure_time")
                        if fam_id not in participating_families:
                            participating_families.append(fam_id)
                        break

            # If no families found explicitly, assume all families participate
            if not participating_families:
                participating_families = list(families_data.keys())

            rows.append({
                "id": "",  # filled by caller
                "type": "dining",
                "status": "pending",
                "title": poi_name,
                "description": f"{meal_type.capitalize()} · {loc_id}",
                "date": day_date_label,
                "time": arrival_time,
                "price": 0,  # restaurant cost not in optimizer output
                "ref_id": target_poi_id,
                "meta_secondary": f"{arrival_time} – {departure_time}" if arrival_time and departure_time else None,
                "families": participating_families,
            })

        return rows

    @staticmethod
    def _extract_cab_transport(
        day_obj: dict,
        day_num: int,
        day_date_label: str,
    ) -> list[dict]:
        """
        Extract CAB and CAB_FALLBACK transport from all families.
        Deduplicate identical from→to segments across families.
        """
        families_data = day_obj.get("families", {})
        # Key: (from, to) → row dict
        segment_map: dict[tuple[str, str], dict] = {}

        for fam_id, fam_data in families_data.items():
            for seg in fam_data.get("transport", []):
                if seg["mode"] not in ("CAB", "CAB_FALLBACK"):
                    continue

                key = (seg["from"], seg["to"])
                if key not in segment_map:
                    segment_map[key] = {
                        "id": "",  # filled by caller
                        "type": "transport",
                        "status": "pending",
                        "title": f"Cab: {seg['from_name']} → {seg['to_name']}",
                        "description": f"{seg['mode']} · {seg['duration_min']} min",
                        "date": day_date_label,
                        "time": None,  # transport doesn't have explicit times in data
                        "price": round(seg["cost"], 2),
                        "ref_id": f"CAB-D{day_num}-{seg['from'][:6]}",
                        "meta_secondary": f"{seg['duration_min']} min",
                        "families": [],
                    }
                if fam_id not in segment_map[key]["families"]:
                    segment_map[key]["families"].append(fam_id)

        return list(segment_map.values())
