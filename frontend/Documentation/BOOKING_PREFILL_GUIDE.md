# Booking Prefill Feature Guide

## Overview
The booking system now automatically prefills search forms with group data, making it hassle-free for travel agents to book services for their groups.

## How It Works

### 1. Starting a New Booking
When an agent clicks "New Booking" from the bookings page:
- The system captures the selected group ID
- Group data is loaded automatically
- The booking form is prefilled with relevant information

### 2. Prefilled Fields

#### Automatically Filled:
- **Destination**: Taken from group's destination (e.g., "Goa, India")
- **Travel Date**: Set to group's start date
- **Number of Travelers**: Calculated from group size
  - Formula: `adults + children + seniors`
  - Example: 2 adults + 2 children = 4 travelers

#### Default Values (Can be Modified):
- **Origin**: Defaults to "New Delhi (DEL)"
- **Class**: Defaults to "Economy"

### 3. User Flow

```
Group Selection → Click "New Booking" → Select Type (Flight/Hotel/etc.)
                                              ↓
                                    Form Opens with Prefilled Data
                                              ↓
                                    Agent Reviews/Modifies if Needed
                                              ↓
                                    Click "Search" → View Results
                                              ↓
                                    Select Option → Confirm Booking
```

## Example Scenarios

### Scenario 1: Booking a Flight for Sharma Family
**Group Data:**
- Name: Sharma Family Vacation
- Destination: Goa, India
- Start Date: 2023-11-14
- Members: 2 adults + 2 children = 4 travelers

**Prefilled Form:**
```
From: New Delhi (DEL)
To: Goa, India ✓ (auto-filled)
Date: 2023-11-14 ✓ (auto-filled)
Travelers: 4 ✓ (auto-calculated)
Class: Economy
```

### Scenario 2: Booking a Hotel for Tech Corp
**Group Data:**
- Name: Tech Corp Offsite
- Destination: Bangalore, India
- Start Date: 2023-11-15
- Members: 3 adults

**Prefilled Form:**
```
Location: Bangalore, India ✓ (auto-filled)
Check-in: 2023-11-15 ✓ (auto-filled)
Guests: 3 ✓ (auto-calculated)
```

## Benefits

### For Travel Agents:
✅ **Faster Booking**: No manual data entry required
✅ **Fewer Errors**: Data comes directly from group records
✅ **Better Context**: See group details while booking
✅ **Seamless Workflow**: From selection to booking in seconds

### For the System:
✅ **Data Consistency**: All bookings use accurate group data
✅ **Audit Trail**: Clear link between groups and bookings
✅ **Better UX**: Reduced friction in booking process

## Technical Implementation

### Data Flow:
```typescript
// 1. Group data is loaded
const group = allGroups.find(g => g.id === groupId);

// 2. Form is initialized with group data
const initialCriteria = {
    destination: group.destination,
    date: group.startDate,
    travelers: group.groupSize.adults + 
               group.groupSize.children + 
               group.groupSize.seniors
};

// 3. Form updates when group changes
useEffect(() => {
    if (group) {
        setCriteria(prev => ({
            ...prev,
            destination: group.destination,
            date: group.startDate,
            travelers: totalTravelers
        }));
    }
}, [group]);
```

### Key Components:
- **BookingSearchForm**: Receives group prop and prefills fields
- **NewBookingPage**: Loads group data and passes to form
- **Data Layer**: Provides group information with proper typing

## Customization

Agents can modify any prefilled field:
- Change destination if booking for a different location
- Adjust dates for pre-trip or post-trip bookings
- Modify traveler count for partial group bookings
- Change class/category as needed

## Future Enhancements

Potential improvements:
- [ ] Remember agent's preferred origin city
- [ ] Suggest optimal booking times based on group schedule
- [ ] Auto-calculate return dates for round trips
- [ ] Prefill passenger names from group member list
- [ ] Smart suggestions based on group preferences
- [ ] Budget-aware filtering of search results

## Troubleshooting

### Form Not Prefilling?
- Check that groupId is in the URL parameters
- Verify group data exists in `allGroups`
- Ensure group has required fields (destination, startDate, groupSize)

### Wrong Data Showing?
- Confirm correct group is selected in sidebar
- Check URL parameter matches selected group
- Verify group data structure matches expected format

## API Integration Notes

When connecting to backend:
```typescript
// Replace static data with API call
const group = await fetch(`/api/groups/${groupId}`).then(r => r.json());

// Prefill logic remains the same
const criteria = {
    destination: group.destination,
    date: group.startDate,
    travelers: calculateTotalTravelers(group.groupSize)
};
```

## Support

For issues or questions about the prefill feature:
1. Check this guide first
2. Review the DATA_INTEGRATION_SUMMARY.md
3. Check TypeScript types in `frontend/lib/agent-dashboard/types.ts`
4. Verify data structure in `frontend/lib/agent-dashboard/data.ts`
