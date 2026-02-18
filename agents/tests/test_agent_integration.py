import sys
import os
import json
from pathlib import Path

# Add project root
sys.path.append(os.getcwd())

from agents.optimizer_agent import OptimizerAgent

class TestAgent(OptimizerAgent):
    def __init__(self):
        super().__init__()
        # Override to use CLUSTERED itinerary for this test
        self.base_itinerary_path = self.data_dir / "base_itinerary_clustered.json"
        print(f"TestAgent initialized with: {self.base_itinerary_path}")

if __name__ == "__main__":
    agent = TestAgent()
    # Mock event
    result = agent.run(preferences={"event_type": "TEST_RUN", "family_id": "FAM_A"})
    
    print("\n------------------------------------------------")
    print("Agent Result Files:")
    if result:
        # Check backbone content
        first_file = list(result.values())[0] if result else None
        if first_file:
            backbone_path = first_file.parent / "optimized_backbone.json"
            if backbone_path.exists():
                with open(backbone_path, 'r') as f:
                    data = json.load(f)
                    print("\nBackbone Generated:")
                    assignments = data.get("hotel_assignments", {}).get("FAM_A", [])
                    print(json.dumps(assignments[:3], indent=2))
            else:
                 print("\nERROR: Backbone file not generated!")
    else:
        print("Run returned empty result.")
