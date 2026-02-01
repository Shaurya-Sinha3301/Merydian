"""
Demo Script - Showcases the agent system with sample scenarios.
Run this to see the complete pipeline in action.
"""
from .agent_controller import AgentController


def main():
    """Run the agent system demo."""
    print("""
╔═══════════════════════════════════════════════════════════════════════════╗
║                   VOYAGEUR AGENTIC AI SYSTEM DEMO                         ║
║                                                                           ║
║  This demo showcases a clean, event-driven agent architecture that       ║
║  orchestrates your existing optimizer and explainability systems.        ║
║                                                                           ║
║  Architecture:                                                            ║
║    User Input → Feedback Agent → Decision Agent → Optimizer Agent        ║
║                                                    ↓                      ║
║                                          Explainability Agent             ║
╚═══════════════════════════════════════════════════════════════════════════╝
    """)
    
    # Initialize the controller
    print("Initializing agent system...\n")
    controller = AgentController()
    
    print("✓ All agents initialized successfully")
    print("\nAgent system ready. Running demo scenarios...\n")
    
    # Run demo scenarios
    controller.run_demo_scenarios()
    
    print("\nThank you for trying the Voyageur Agent System!")
    print("For documentation, see: agents/Documentation/")


if __name__ == "__main__":
    main()
