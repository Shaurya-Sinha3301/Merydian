"""
Geographic Look-Ahead Test
Tests that the optimizer chooses Day 3 for a POI that's geographically closer to Day 3 skeleton POIs
"""
import sys
import json
from pathlib import Path
from math import radians, cos, sin, asin, sqrt

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

def haversine(lat1, lon1, lat2, lon2):
    """Calculate distance in km between two points"""
    R = 6371
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    return R * c

def main():
    # Load locations
    locs_path = Path("ml_or/data/locations.json")
    with open(locs_path, 'r') as f:
        locations = json.load(f)
    
    # Day 2 skeleton POIs (from base_itinerary_final.json - only real location IDs)
    day2_skeleton = ["LOC_005", "LOC_006", "LOC_009"]  # Humayun, Akshardham, Purana Qila
    
    # Day 3 skeleton POIs
    day3_skeleton = ["LOC_046", "LOC_003"]  # Parikrama, India Gate
    
    print("=" * 80)
    print("GEOGRAPHIC LOOK-AHEAD TEST: Finding POI Closer to Day 3")
    print("=" * 80)
    
    print("\nDay 2 Skeleton POIs:")
    day2_lats, day2_lons = [], []
    for pid in day2_skeleton:
        if pid not in locations:  # Skip LOC_LUNCH, LOC_DINNER, etc.
            continue
        loc = locations[pid]
        print(f"  {pid}: {loc['name']} ({loc['latitude']:.4f}, {loc['longitude']:.4f})")
        day2_lats.append(loc['latitude'])
        day2_lons.append(loc['longitude'])
    
    if not day2_lats:
        print("  ERROR: No valid Day 2 POIs found")
        return None
    
    day2_center = (sum(day2_lats) / len(day2_lats), sum(day2_lons) / len(day2_lons))
    print(f"  → Day 2 Centroid: ({day2_center[0]:.4f}, {day2_center[1]:.4f})")
    
    print("\nDay 3 Skeleton POIs:")
    day3_lats, day3_lons = [], []
    for pid in day3_skeleton:
        if pid not in locations:  # Skip LOC_LUNCH, LOC_DINNER, etc.
            continue
        loc = locations[pid]
        print(f"  {pid}: {loc['name']} ({loc['latitude']:.4f}, {loc['longitude']:.4f})")
        day3_lats.append(loc['latitude'])
        day3_lons.append(loc['longitude'])
    
    if not day3_lats:
        print("  ERROR: No valid Day 3 POIs found")
        return None
    
    day3_center = (sum(day3_lats) / len(day3_lats), sum(day3_lons) / len(day3_lons))
    print(f"  → Day 3 Centroid: ({day3_center[0]:.4f}, {day3_center[1]:.4f})")
    
    # Find a non-skeleton POI closer to Day 3
    print("\n" + "=" * 80)
    print("Searching for POI closer to Day 3 than Day 2...")
    print("=" * 80)
    
    candidates = []
    for pid, loc in locations.items():
        if loc.get('role') == 'Skeleton':
            continue
        if loc.get('category') in ['HOTEL', 'START', 'END', 'LUNCH', 'DINNER']:
            continue
        
        lat, lon = loc['latitude'], loc['longitude']
        dist_to_day2 = haversine(lat, lon, day2_center[0], day2_center[1])
        dist_to_day3 = haversine(lat, lon, day3_center[0], day3_center[1])
        
        # Find POIs significantly closer to Day 3
        if dist_to_day3 < dist_to_day2:
            diff = dist_to_day2 - dist_to_day3
            candidates.append({
                'id': pid,
                'name': loc['name'],
                'lat': lat,
                'lon': lon,
                'dist_to_day2': dist_to_day2,
                'dist_to_day3': dist_to_day3,
                'diff': diff
            })
    
    # Sort by difference (descending)
    candidates.sort(key=lambda x: x['diff'], reverse=True)
    
    print(f"\nFound {len(candidates)} POIs closer to Day 3:")
    print("\nTop 5 candidates (POIs much closer to Day 3):")
    for i, c in enumerate(candidates[:5], 1):
        print(f"\n{i}. {c['id']}: {c['name']}")
        print(f"   Distance to Day 2: {c['dist_to_day2']:.2f} km")
        print(f"   Distance to Day 3: {c['dist_to_day3']:.2f} km")
        print(f"   Difference: {c['diff']:.2f} km (Day 3 is CLOSER)")
    
    if candidates:
        best = candidates[0]
        print("\n" + "=" * 80)
        print(f"RECOMMENDATION: Use {best['id']} ({best['name']})")
        print(f"  This POI is {best['diff']:.2f} km closer to Day 3 than Day 2")
        print("=" * 80)
        return best['id']
    
    return None

if __name__ == "__main__":
    poi_id = main()
    if poi_id:
        print(f"\n✓ Test POI identified: {poi_id}")
        print("  Next: Run integration demo with this POI to verify geographic look-ahead")
    else:
        print("\n✗ No suitable test POI found")
