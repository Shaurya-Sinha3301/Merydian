"""
Demo Feedback API - Simplified real-time feedback for demonstration purposes

This endpoint provides a quick demo of how customer feedback can trigger
itinerary updates. It uses simple pattern matching and in-memory state
for demonstration purposes.
"""

from typing import Any, Dict, List
from datetime import datetime, time
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

# In-memory storage for demo itinerary (simplified)
demo_itinerary = {
    "destination": "Delhi, India",
    "start_date": "2026-03-15",
    "end_date": "2026-03-17",
    "days": [
        {
            "day": "Day 1",
            "date": "March 15, 2026",
            "items": [
                {"time": "09:00 AM", "title": "Raj Ghat", "type": "attraction", "icon": "🙏"},
                {"time": "12:30 PM", "title": "Group Lunch", "type": "restaurant", "icon": "🍽️"},
                {"time": "02:00 PM", "title": "Red Fort", "type": "attraction", "icon": "🏰"},
                {"time": "04:30 PM", "title": "Safdarjung Tomb", "type": "attraction", "icon": "🏛️"},
                {"time": "07:30 PM", "title": "Group Dinner", "type": "restaurant", "icon": "🍽️"},
            ],
        },
        {
            "day": "Day 2",
            "date": "March 16, 2026",
            "items": [
                {"time": "09:00 AM", "title": "Humayun Tomb", "type": "attraction", "icon": "🏛️"},
                {"time": "11:00 AM", "title": "Akshardham Temple", "type": "attraction", "icon": "🛕"},
                {"time": "01:00 PM", "title": "Late Group Lunch", "type": "restaurant", "icon": "🍽️"},
                {"time": "03:00 PM", "title": "Purana Qila", "type": "attraction", "icon": "🏰"},
                {"time": "07:30 PM", "title": "Day 2 Dinner", "type": "restaurant", "icon": "🍽️"},
            ],
        },
    ],
    "stats": {
        "activities": 10,
        "hotels": 2,
        "restaurants": 4,
        "attractions": 6,
        "total_cost": 45000,
    }
}

# Known locations with their metadata
KNOWN_LOCATIONS = {
    "red fort": {"icon": "🏰", "type": "attraction", "duration_hours": 2},
    "qutub minar": {"icon": "🗼", "type": "attraction", "duration_hours": 1.5},
    "india gate": {"icon": "🏛️", "type": "attraction", "duration_hours": 1},
    "lotus temple": {"icon": "🛕", "type": "attraction", "duration_hours": 1},
    "chandni chowk": {"icon": "🏪", "type": "attraction", "duration_hours": 2},
    "jama masjid": {"icon": "🕌", "type": "attraction", "duration_hours": 1},
    "connaught place": {"icon": "🏢", "type": "attraction", "duration_hours": 1.5},
    "lodhi garden": {"icon": "🌳", "type": "attraction", "duration_hours": 1},
}


class DemoFeedbackRequest(BaseModel):
    message: str = Field(..., description="Natural language feedback message")


class DemoFeedbackResponse(BaseModel):
    success: bool
    action: str
    message: str
    updated_itinerary: Dict[str, Any]
    added_items: List[str] = []


def parse_location_request(message: str) -> tuple[str, str | None]:
    """
    Parse natural language message to extract action and location.
    
    Returns:
        (action, location) tuple where action is 'add' or 'remove'
    """
    message_lower = message.lower().strip()
    
    # Check for add patterns
    add_patterns = [
        r"add\s+(.+)",
        r"include\s+(.+)",
        r"visit\s+(.+)",
        r"go\s+to\s+(.+)",
        r"see\s+(.+)",
    ]
    
    for pattern in add_patterns:
        match = re.search(pattern, message_lower)
        if match:
            location = match.group(1).strip()
            return "add", location
    
    # Check for remove patterns
    remove_patterns = [
        r"remove\s+(.+)",
        r"skip\s+(.+)",
        r"delete\s+(.+)",
        r"cancel\s+(.+)",
    ]
    
    for pattern in remove_patterns:
        match = re.search(pattern, message_lower)
        if match:
            location = match.group(1).strip()
            return "remove", location
    
    return "unknown", None


def get_location_metadata(location_name: str) -> Dict[str, Any]:
    """Get metadata for a location, with defaults if not found."""
    location_key = location_name.lower().strip()
    
    if location_key in KNOWN_LOCATIONS:
        return KNOWN_LOCATIONS[location_key]
    
    # Default metadata for unknown locations
    return {"icon": "📍", "type": "attraction", "duration_hours": 1}


def add_location_to_itinerary(location_name: str) -> List[str]:
    """
    Add a location to the demo itinerary.
    Returns list of added item titles.
    """
    # Get location metadata
    metadata = get_location_metadata(location_name)
    
    # Format location name (title case)
    formatted_name = location_name.title()
    
    # Check if already exists
    for day in demo_itinerary["days"]:
        for item in day["items"]:
            if item["title"].lower() == location_name.lower():
                return []  # Already exists
    
    # Add to Day 1 at 5:00 PM (before dinner)
    new_item = {
        "time": "05:00 PM",
        "title": formatted_name,
        "type": metadata["type"],
        "icon": metadata["icon"],
        "is_new": True,  # Flag for frontend animation
    }
    
    # Insert before the last item (dinner)
    demo_itinerary["days"][0]["items"].insert(-1, new_item)
    
    # Update stats
    demo_itinerary["stats"]["activities"] += 1
    if metadata["type"] == "attraction":
        demo_itinerary["stats"]["attractions"] += 1
    
    return [formatted_name]


def remove_location_from_itinerary(location_name: str) -> List[str]:
    """
    Remove a location from the demo itinerary.
    Returns list of removed item titles.
    """
    removed = []
    
    for day in demo_itinerary["days"]:
        items_to_remove = []
        for i, item in enumerate(day["items"]):
            if item["title"].lower() == location_name.lower():
                items_to_remove.append(i)
                removed.append(item["title"])
        
        # Remove in reverse order to maintain indices
        for i in reversed(items_to_remove):
            item_type = day["items"][i]["type"]
            day["items"].pop(i)
            
            # Update stats
            demo_itinerary["stats"]["activities"] -= 1
            if item_type == "attraction":
                demo_itinerary["stats"]["attractions"] -= 1
    
    return removed


@router.post("/feedback", response_model=DemoFeedbackResponse)
async def submit_demo_feedback(feedback: DemoFeedbackRequest) -> Any:
    """
    Process demo feedback and update itinerary in real-time.
    
    Supports natural language like:
    - "add red fort"
    - "include qutub minar"
    - "remove safdarjung tomb"
    """
    try:
        # Parse the feedback message
        action, location = parse_location_request(feedback.message)
        
        if action == "unknown" or not location:
            return DemoFeedbackResponse(
                success=False,
                action="none",
                message="I couldn't understand that request. Try 'add [location]' or 'remove [location]'",
                updated_itinerary=demo_itinerary,
                added_items=[]
            )
        
        # Process the action
        if action == "add":
            added = add_location_to_itinerary(location)
            if added:
                return DemoFeedbackResponse(
                    success=True,
                    action="add",
                    message=f"Added {added[0]} to your itinerary!",
                    updated_itinerary=demo_itinerary,
                    added_items=added
                )
            else:
                return DemoFeedbackResponse(
                    success=False,
                    action="add",
                    message=f"{location.title()} is already in your itinerary",
                    updated_itinerary=demo_itinerary,
                    added_items=[]
                )
        
        elif action == "remove":
            removed = remove_location_from_itinerary(location)
            if removed:
                return DemoFeedbackResponse(
                    success=True,
                    action="remove",
                    message=f"Removed {removed[0]} from your itinerary",
                    updated_itinerary=demo_itinerary,
                    added_items=[]
                )
            else:
                return DemoFeedbackResponse(
                    success=False,
                    action="remove",
                    message=f"{location.title()} was not found in your itinerary",
                    updated_itinerary=demo_itinerary,
                    added_items=[]
                )
        
        return DemoFeedbackResponse(
            success=False,
            action="none",
            message="Something went wrong processing your request",
            updated_itinerary=demo_itinerary,
            added_items=[]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process demo feedback: {str(e)}"
        )


@router.get("/itinerary", response_model=Dict[str, Any])
async def get_demo_itinerary() -> Any:
    """Get the current demo itinerary state."""
    return demo_itinerary


@router.post("/reset")
async def reset_demo_itinerary() -> Dict[str, str]:
    """Reset the demo itinerary to initial state."""
    global demo_itinerary
    
    demo_itinerary = {
        "destination": "Delhi, India",
        "start_date": "2026-03-15",
        "end_date": "2026-03-17",
        "days": [
            {
                "day": "Day 1",
                "date": "March 15, 2026",
                "items": [
                    {"time": "09:00 AM", "title": "Raj Ghat", "type": "attraction", "icon": "🙏"},
                    {"time": "12:30 PM", "title": "Group Lunch", "type": "restaurant", "icon": "🍽️"},
                    {"time": "02:00 PM", "title": "Red Fort", "type": "attraction", "icon": "🏰"},
                    {"time": "04:30 PM", "title": "Safdarjung Tomb", "type": "attraction", "icon": "🏛️"},
                    {"time": "07:30 PM", "title": "Group Dinner", "type": "restaurant", "icon": "🍽️"},
                ],
            },
            {
                "day": "Day 2",
                "date": "March 16, 2026",
                "items": [
                    {"time": "09:00 AM", "title": "Humayun Tomb", "type": "attraction", "icon": "🏛️"},
                    {"time": "11:00 AM", "title": "Akshardham Temple", "type": "attraction", "icon": "🛕"},
                    {"time": "01:00 PM", "title": "Late Group Lunch", "type": "restaurant", "icon": "🍽️"},
                    {"time": "03:00 PM", "title": "Purana Qila", "type": "attraction", "icon": "🏰"},
                    {"time": "07:30 PM", "title": "Day 2 Dinner", "type": "restaurant", "icon": "🍽️"},
                ],
            },
        ],
        "stats": {
            "activities": 10,
            "hotels": 2,
            "restaurants": 4,
            "attractions": 6,
            "total_cost": 45000,
        }
    }
    
    return {"message": "Demo itinerary reset to initial state"}


# Store latest received data for verification
latest_optimization_data = {}


class OptimizationData(BaseModel):
    trip_id: str
    iteration: int
    itinerary: Dict[str, Any]
    llm_payloads: List[Dict[str, Any]]
    explanations: List[str]


@router.post("/receive_optimization")
async def receive_optimization_data(data: OptimizationData) -> Dict[str, Any]:
    """
    Receive optimized itinerary and LLM payloads from the demo script.
    """
    global latest_optimization_data
    
    print(f"\n[API] Received Optimization Data for Trip: {data.trip_id}")
    print(f"[API] Iteration: {data.iteration}")
    print(f"[API] LLM Payloads Received: {len(data.llm_payloads)}")
    
    # Store for retrieval
    latest_optimization_data = data.dict()
    
    return {
        "success": True,
        "message": f"Successfully received optimization data for iteration {data.iteration}",
        "data_summary": {
            "trip_id": data.trip_id,
            "items_count": len(data.llm_payloads),
            "timestamp": datetime.now().isoformat()
        }
    }


@router.get("/latest_optimization")
async def get_latest_optimization() -> Dict[str, Any]:
    """Get the latest optimization data received from the demo script."""
    return latest_optimization_data
