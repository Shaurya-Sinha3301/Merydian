
import json
import math
from typing import Dict, List, Tuple
from dataclasses import dataclass

@dataclass
class Location:
    location_id: str
    lat: float
    lng: float
    cost: float
    tags: List[str]

class HotelOptimizer:
    def __init__(self, 
                 locations_file: str = "ml_or/data/locations.json",
                 base_itinerary_file: str = "ml_or/data/base_itinerary_final.json",
                 family_prefs_file: str = "ml_or/data/family_preferences_3fam_strict.json"):
        
        self.locations = self._load_locations(locations_file)
        self.base_itinerary = self._load_json(base_itinerary_file)
        self.family_prefs = self._load_json(family_prefs_file)
        
    def _load_json(self, filepath: str):
        with open(filepath, 'r') as f:
            return json.load(f)
            
    def _load_locations(self, filepath: str) -> Dict[str, Location]:
        data = self._load_json(filepath)
        locs = {}
        for item in data:
            locs[item['location_id']] = Location(
                location_id=item['location_id'],
                lat=item['lat'],
                lng=item['lng'],
                cost=item.get('cost', 0),
                tags=item.get('tags', [])
            )
        return locs

    def _haversine_distance(self, loc1: Location, loc2: Location) -> float:
        R = 6371  # Earth radius in km
        dlat = math.radians(loc2.lat - loc1.lat)
        dlon = math.radians(loc2.lng - loc1.lng)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(loc1.lat)) * math.cos(math.radians(loc2.lat)) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c

    def get_trip_centroids(self) -> List[Location]:
        """Calculate the centroid of SKELETON POIs for each day."""
        centroids = []
        for day in self.base_itinerary['days']:
            skeleton_pois = [p['location_id'] for p in day['pois'] if p.get('role') == 'SKELETON']
            
            if not skeleton_pois:
                continue
                
            lat_sum = 0
            lng_sum = 0
            count = 0
            
            for pid in skeleton_pois:
                if pid in self.locations:
                    loc = self.locations[pid]
                    lat_sum += loc.lat
                    lng_sum += loc.lng
                    count += 1
            
            if count > 0:
                centroids.append(Location(
                    location_id=f"CENTROID_DAY_{day['day']}",
                    lat=lat_sum/count,
                    lng=lng_sum/count,
                    cost=0,
                    tags=[]
                ))
        return centroids

    def filter_hotels_by_budget(self, family_pref: Dict) -> List[str]:
        """
        Filter hotels based on budget sensitivity.
        Sensitivity 0.0-0.3: Luxury (Any cost)
        Sensitivity 0.3-0.7: Moderate (< 8000)
        Sensitivity 0.7-1.0: Budget (< 4000)
        """
        sensitivity = family_pref.get('budget_sensitivity', 0.5)
        
        max_cost = float('inf')
        if sensitivity > 0.7:
             max_cost = 4000
        elif sensitivity > 0.3:
             max_cost = 8000
             
        valid_hotels = []
        for lid, loc in self.locations.items():
            if "hotel" in loc.tags:
                if loc.cost <= max_cost:
                    valid_hotels.append(lid)
                    
        return valid_hotels

    def assign_hotels(self) -> Dict:
        assignments = {}
        centroids = self.get_trip_centroids()
        
        print(f"Calculated {len(centroids)} daily centroids for optimization.")
        
        for family in self.family_prefs:
            fid = family['family_id']
            # 1. Filter
            candidates = self.filter_hotels_by_budget(family)
            if not candidates:
                print(f"Warning: No hotels found for {fid} (Sens: {family['budget_sensitivity']}). Fallback to all.")
                candidates = [l for l, v in self.locations.items() if "hotel" in v.tags]
            
            # 2. Score (Minimize total distance to all centroids)
            best_hotel = None
            min_score = float('inf')
            
            for hotel_id in candidates:
                hotel_loc = self.locations[hotel_id]
                score = 0
                for centroid in centroids:
                    score += self._haversine_distance(hotel_loc, centroid)
                
                if score < min_score:
                    min_score = score
                    best_hotel = hotel_id
            
            assignments[fid] = {
                "hotel_id": best_hotel,
                "check_in_time": "14:00",
                "check_out_time": "11:00",
                "assigned_cost": self.locations[best_hotel].cost if best_hotel else 0
            }
            print(f"Assigned {best_hotel} to {fid} (Score: {min_score:.2f} km)")
            
        return assignments

if __name__ == "__main__":
    optimizer = HotelOptimizer()
    assignments = optimizer.assign_hotels()
    
    output_path = "ml_or/data/hotel_assignments.json"
    with open(output_path, 'w') as f:
        json.dump(assignments, f, indent=4)
    print(f"Saved hotel assignments to {output_path}")
