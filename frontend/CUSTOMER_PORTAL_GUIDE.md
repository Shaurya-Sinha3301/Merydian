# Customer Portal Guide

## Overview

The Customer Portal is a neuromorphic black and white minimalist interface that allows customers to:
- View family members and their details
- Browse and manage travel itineraries
- Plan new trips through a modal form
- Connect with travel agents via chat
- View detailed itineraries similar to the agent dashboard

## Design Theme

The portal uses a **neuromorphic black and white minimalist** design:
- Primary colors: `#212121` (black) and `#FDFDFF` (white)
- Accent color: `#EDEDED` (light gray)
- Neuromorphic shadows: `shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.9)]`
- Inset shadows for inputs: `shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.9)]`

## Features

### 1. Family Members Section
- Displays all family members with avatars
- Shows name, relation, and age
- Neuromorphic card design with soft shadows

### 2. Trips Management
- **Upcoming Trips**: Shows trips that haven't started yet
- **Completed Trips**: Historical trips for reference
- Each trip card shows:
  - Destination thumbnail
  - Trip dates
  - Status badge
  - Travelers (with avatars)
  - "View Itinerary" button

### 3. Plan a Trip Modal
- Opens when clicking "Plan a Trip" button
- Explains the trip planning process
- Redirects to `/customer-trip-request` form
- Features neuromorphic modal design

### 4. Agent Chat Modal
- Real-time chat interface with travel agents
- Message history display
- Send messages with Enter key or button
- Neuromorphic message bubbles
- Customer messages: black background
- Agent messages: light gray background

### 5. Detailed Itinerary Modal
- Uses the same `ItineraryView` component as agent dashboard
- Shows complete day-by-day itinerary
- Displays all event details:
  - Time and duration
  - Location and description
  - Cost breakdown
  - Images and highlights
  - Travel time between events
- Total cost summary in footer

## File Structure

```
frontend/app/customer-portal/
├── page.tsx                                    # Main page
└── components/
    ├── CustomerPortalInteractive.tsx           # Main portal component
    ├── FamilyMemberCard.tsx                    # Family member display
    ├── TripCard.tsx                            # Trip card component
    ├── PlanTripModal.tsx                       # Trip planning modal
    ├── AgentChatModal.tsx                      # Chat interface
    └── DetailedItineraryModal.tsx              # Detailed itinerary viewer
```

## Navigation

- **From Landing Page**: Click "Start as Customer" or "Start Planning Your Trip"
- **From Login Page**: Select "Customer" and login
- **URL**: `/customer-portal`

## Key Changes from Previous Design

1. **No Immediate Form**: The trip request form no longer appears immediately. Instead, users see a dashboard first.
2. **Modal-Based Planning**: Trip planning opens in a modal that explains the process before redirecting to the form.
3. **Detailed Itinerary**: Uses the same detailed itinerary viewer as the agent dashboard for consistency.
4. **Agent Communication**: Direct chat interface for customer-agent communication.
5. **Family-Centric**: Emphasizes family members and their trips.

## Usage

### Viewing Family Members
Family members are displayed at the top of the portal with their avatars, names, relations, and ages.

### Planning a New Trip
1. Click "Plan a Trip" button
2. Review the modal information
3. Click "Start Planning"
4. Fill out the trip request form at `/customer-trip-request`

### Viewing Trip Itinerary
1. Find the trip in "Upcoming" or "Completed" sections
2. Click "View Itinerary" button
3. Browse the detailed day-by-day itinerary
4. View images, costs, and event details
5. Close modal when done

### Contacting Travel Agent
1. Click "Contact Agent" button in header
2. Type message in input field
3. Press Enter or click send button
4. View conversation history
5. Close chat when done

## Responsive Design

The portal is fully responsive:
- **Mobile**: Single column layout, stacked cards
- **Tablet**: 2-column grid for trips
- **Desktop**: 4-column grid for family members, 2-column for trips

## Integration with Existing Components

The portal reuses several existing components:
- `Icon` from `@/components/ui/AppIcon`
- `ItineraryView` from `@/components/itinerary/ItineraryView`
- Existing trip request form at `/customer-trip-request`

## Future Enhancements

Potential improvements:
- Real-time notifications for trip updates
- Trip modification requests from portal
- Document uploads (passports, IDs)
- Payment integration
- Trip sharing with family members
- Calendar integration
- Mobile app version
