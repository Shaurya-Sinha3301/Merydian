
import json
import math
import random
from typing import List, Dict

LOCATIONS_FILE = "ml_or/data/locations.json"
OUTPUT_FILE = "ml_or/data/transport_graph.json"

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def generate_graph():
    random.seed(42) # Deterministic generation
    
    with open(LOCATIONS_FILE, 'r') as f:
        locations = json.load(f)
        
    print(f"Loaded {len(locations)} locations.")
    
    # 1. Classify Nodes (Simulating infrastructure)
    # We assign flags to locations.
    # Metro: 60% chance
    # Bus: 80% chance
    # Auto: 90% chance (accessibility)
    
    node_meta = {}
    for loc in locations:
        lid = loc['location_id']
        node_meta[lid] = {
            'has_metro': random.random() < 0.6,
            'has_bus': random.random() < 0.8,
            'has_auto': random.random() < 0.9
        }
    
    edges = []
    edge_counter = 1
    
    # 2. Generate Edges
    # O(N^2) loop - acceptable for < 1000 nodes. 
    # Current nodes ~60? 60*60 = 3600 pairs. Trivial.
    
    for i in range(len(locations)):
        for j in range(len(locations)):
            if i == j:
                continue
                
            loc_a = locations[i]
            loc_b = locations[j]
            id_a = loc_a['location_id']
            id_b = loc_b['location_id']
            
            dist = haversine(loc_a['lat'], loc_a['lng'], loc_b['lat'], loc_b['lng'])
            
            # Skip physically impossible/useless edges (optional, but good for density control)
            # If distance < 0.1km, assume walking (no transport edge needed?) 
            # Actually, let's keep them so people don't get stranded.
            
            # --- METRO ---
            # Rule: Both ends must have metro station.
            # Cost: 2*dist + 10
            # Speed: 40 km/h
            # Reliability: 0.98
            if node_meta[id_a]['has_metro'] and node_meta[id_b]['has_metro']:
                duration = int((dist / 40.0) * 60) + 5 # +5 min entry/exit penalty
                cost = int(2 * dist + 10)
                edges.append({
                    "edge_id": f"EDGE_M_{edge_counter}",
                    "from": id_a,
                    "to": id_b,
                    "mode": "METRO",
                    "duration_min": max(5, duration),
                    "cost": max(10, cost),
                    "reliability": 0.98
                })
                edge_counter += 1
                
            # --- BUS ---
            # Rule: Both ends must have bus stop.
            # Cost: 5*dist + 5
            # Speed: 15 km/h (Slow)
            # Reliability: 0.75 (Traffic)
            if node_meta[id_a]['has_bus'] and node_meta[id_b]['has_bus']:
                duration = int((dist / 15.0) * 60) + 10 # +10 min wait penalty
                cost = int(5 * dist + 5)
                edges.append({
                    "edge_id": f"EDGE_B_{edge_counter}",
                    "from": id_a,
                    "to": id_b,
                    "mode": "BUS",
                    "duration_min": max(10, duration),
                    "cost": max(5, cost),
                    "reliability": 0.75
                })
                edge_counter += 1
                
            # --- AUTO (Rickshaw) ---
            # Rule: Short distance only (<10km). Both ends accessible.
            # Cost: 10*dist + 30
            # Speed: 25 km/h
            # Reliability: 0.90
            if dist <= 10.0 and node_meta[id_a]['has_auto'] and node_meta[id_b]['has_auto']:
                duration = int((dist / 25.0) * 60) + 2 # +2 min hail time
                cost = int(10 * dist + 30)
                edges.append({
                    "edge_id": f"EDGE_A_{edge_counter}",
                    "from": id_a,
                    "to": id_b,
                    "mode": "AUTO",
                    "duration_min": max(5, duration),
                    "cost": max(40, cost),
                    "reliability": 0.90
                })
                edge_counter += 1

            # --- CAB (Explicit) ---
            # We add explicit cabs for reasonable distances to ensure connectivity
            # even if fallback exists. This allows the optimizer to see it clearly as an option.
            # Cost: 15*dist + 50
            # Speed: 30 km/h
            if dist <= 20.0: # Explicit cabs for <20km. Longer trips use fallback or Metro.
                duration = int((dist / 30.0) * 60) + 5 # +5 min wait
                cost = int(15 * dist + 50)
                edges.append({
                    "edge_id": f"EDGE_C_{edge_counter}",
                    "from": id_a,
                    "to": id_b,
                    "mode": "CAB",
                    "duration_min": max(10, duration),
                    "cost": max(50, cost),
                    "reliability": 1.0
                })
                edge_counter += 1

    print(f"Generated {len(edges)} edges.")
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(edges, f, indent=2)
    print(f"Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_graph()
