"""
Quick Demo Script - Single scenario test with rate limiting enabled.
Use this to test agent system with minimal API calls.
"""
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from agents.agent_controller import AgentController


def main():
    """Run a single-scenario demo to test rate limiting."""
    print("=" * 80)
    print("QUICK DEMO - Testing Single Scenario with Rate Limiting")
    print("=" * 80)
    print("\nThis demo tests the agent system with just ONE scenario")
    print("to minimize API calls while verifying functionality.\n")
    
    # Initialize the controller
    print("Initializing agent system...\n")
    controller = AgentController()
    
    print("✓ All agents initialized successfully\n")
    
    # Run a single test scenario - Must-Visit location (triggers optimizer)
    test_input = "We loved Akshardham, we definitely want to visit it tomorrow."
    
    print(f"Test Input: \"{test_input}\"\n")
    print("-" * 80)
    
    result = controller.process_user_input(test_input)
    
    print("\n" + "=" * 80)
    print("RESULTS")
    print("=" * 80)
    print(f"Event Type: {result['event'].event_type}")
    print(f"Confidence: {result['event'].confidence}")
    print(f"Decision: {result['decision'].action}")
    print(f"Reason: {result['decision'].reason}")
    
    if result['optimizer_output']:
        print(f"\n✓ Optimizer executed successfully!")
        print(f"  Output directory: {list(result['optimizer_output'].values())[0].parent}")
        
    if result['explanations']:
        print(f"\n✓ Explanations generated: {len(result['explanations'])}")
        for i, exp in enumerate(result['explanations'], 1):
            print(f"  {i}. {exp.summary[:100]}...")
    
    print("\n" + "=" * 80)
    print("Demo completed successfully!")
    print("=" * 80)


if __name__ == "__main__":
    main()
