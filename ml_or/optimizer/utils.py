"""
Utility functions for time parsing, normalization, and common operations.
"""

from typing import List, Tuple
from datetime import datetime, time


def parse_time(time_str: str) -> time:
    """
    Parse time string in HH:MM format to time object.
    
    Args:
        time_str: Time string in format "HH:MM"
    
    Returns:
        time object
    
    Raises:
        ValueError: If format is invalid
    """
    try:
        return datetime.strptime(time_str, "%H:%M").time()
    except ValueError as e:
        raise ValueError(f"Invalid time format '{time_str}'. Expected 'HH:MM'") from e


def time_to_minutes(time_str: str, reference_date: str = "2000-01-01") -> int:
    """
    Convert time string to minutes since midnight.
    
    Args:
        time_str: Time string in format "HH:MM"
        reference_date: Reference date for datetime (unused but kept for consistency)
    
    Returns:
        Minutes since midnight
    """
    t = parse_time(time_str)
    return t.hour * 60 + t.minute


def minutes_to_time(minutes: int) -> str:
    """
    Convert minutes since midnight back to HH:MM format.
    
    Args:
        minutes: Minutes since midnight
    
    Returns:
        Time string in format "HH:MM"
    """
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours:02d}:{mins:02d}"


def normalize_values(values: List[float]) -> List[float]:
    """
    Normalize a list of values to [0, 1] range using min-max scaling.
    
    Args:
        values: List of numeric values
    
    Returns:
        List of normalized values
    """
    if not values:
        return []
    
    min_val = min(values)
    max_val = max(values)
    
    if min_val == max_val:
        # All values are the same, return 0.5 for all
        return [0.5] * len(values)
    
    return [(v - min_val) / (max_val - min_val) for v in values]


def calculate_grouping_split_count(grouping: List[List[str]]) -> int:
    """
    Calculate the number of subgroups in a grouping.
    
    Args:
        grouping: List of subgroups (each subgroup is a list of user IDs)
    
    Returns:
        Number of subgroups
    """
    return len(grouping)


def is_valid_grouping(grouping: List[List[str]], users: List[str]) -> bool:
    """
    Validate that a grouping contains all users exactly once.
    
    Args:
        grouping: List of subgroups
        users: List of all users
    
    Returns:
        True if valid, False otherwise
    """
    all_users_in_grouping = []
    for subgroup in grouping:
        all_users_in_grouping.extend(subgroup)
    
    return sorted(all_users_in_grouping) == sorted(users)


def get_all_transport_legs(transport_options: List) -> List[str]:
    """
    Get unique leg IDs from transport options.
    
    Args:
        transport_options: List of transport option dicts/objects
    
    Returns:
        List of unique leg IDs
    """
    legs = set()
    for option in transport_options:
        leg_id = option.leg_id if hasattr(option, 'leg_id') else option['leg_id']
        legs.add(leg_id)
    return list(legs)
