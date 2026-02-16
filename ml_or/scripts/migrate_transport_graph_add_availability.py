"""
Migration Script: Add 'available' Field to Transport Graph
============================================================

This script adds the 'available': true field to all transport edges
in the transport_graph.json file. This enables disruption handling
by allowing edges to be marked as temporarily unavailable.

Usage:
    python ml_or/scripts/migrate_transport_graph_add_availability.py
"""

import json
from pathlib import Path
from datetime import datetime


def migrate_transport_graph():
    """Add 'available': true to all edges in transport_graph.json"""
    
    # Determine paths
    script_dir = Path(__file__).parent
    ml_or_dir = script_dir.parent
    graph_path = ml_or_dir / "data" / "transport_graph.json"
    
    print("=" * 70)
    print("TRANSPORT GRAPH MIGRATION: Adding 'available' Field")
    print("=" * 70)
    print(f"\nTarget file: {graph_path}")
    
    # Load original graph
    print("\n[STEP 1] Loading original transport graph...")
    with open(graph_path, 'r', encoding='utf-8') as f:
        edges = json.load(f)
    
    print(f"  [OK] Loaded {len(edges)} edges")
    
    # Check if already migrated
    already_migrated = all('available' in edge for edge in edges)
    if already_migrated:
        print("\n  WARNING: All edges already have 'available' field!")
        print("  Migration appears to have been run before.")
        response = input("\n  Continue anyway? (y/n): ")
        if response.lower() != 'y':
            print("\n  Aborted.")
            return
    
    # Backup original
    print("\n[STEP 2] Creating backup...")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = graph_path.with_name(f"transport_graph_{timestamp}.backup.json")
    
    with open(backup_path, 'w', encoding='utf-8') as f:
        json.dump(edges, f, indent=2)
    
    print(f"  [OK] Backup saved: {backup_path}")
    
    # Add available field
    print("\n[STEP 3] Adding 'available' field to edges...")
    modified_count = 0
    
    for edge in edges:
        if 'available' not in edge:
            edge['available'] = True
            modified_count += 1
    
    print(f"  [OK] Modified {modified_count} edges")
    print(f"  [OK] Skipped {len(edges) - modified_count} edges (already had field)")
    
    # Save updated graph
    print("\n[STEP 4] Saving updated transport graph...")
    with open(graph_path, 'w', encoding='utf-8') as f:
        json.dump(edges, f, indent=2)
    
    print(f"  [OK] Saved updated graph: {graph_path}")
    
    # Verify
    print("\n[STEP 5] Verifying migration...")
    with open(graph_path, 'r', encoding='utf-8') as f:
        updated_edges = json.load(f)
    
    all_have_field = all('available' in edge for edge in updated_edges)
    all_true = all(edge.get('available') == True for edge in updated_edges)
    
    if all_have_field and all_true:
        print("  [OK] Verification passed!")
        print(f"    - All {len(updated_edges)} edges have 'available' field")
        print(f"    - All edges are available=true")
    else:
        print("  [ERROR] Verification failed!")
        return
    
    # Sample output
    print("\n[SAMPLE] First 3 edges after migration:")
    for i, edge in enumerate(updated_edges[:3]):
        print(f"\n  Edge {i+1}: {edge['edge_id']}")
        print(f"    Mode: {edge['mode']}")
        print(f"    From: {edge['from']} -> To: {edge['to']}")
        print(f"    Available: {edge['available']}")
    
    print("\n" + "=" * 70)
    print("MIGRATION COMPLETE [OK]")
    print("=" * 70)
    print(f"\nTotal edges migrated: {len(edges)}")
    print(f"Backup file: {backup_path}")
    print("\nNext steps:")
    print("  1. Update optimizer's _load_transport() method")
    print("  2. Implement disruption management in TripSessionManager")
    print("  3. Test with transport disruption scenario")


if __name__ == "__main__":
    migrate_transport_graph()
