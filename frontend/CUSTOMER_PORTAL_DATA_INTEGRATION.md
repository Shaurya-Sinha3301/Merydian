# Customer Portal - Data Integration Summary

## Overview

The customer portal has been fully integrated with real data from the data folder and features a professional neuromorphic black and white design.

## Key Features

### 1. Authentication System
- **Login Page**: `/customer-login`
- **Family ID Format**: FAM001, FAM002, etc.
- **Password**: Any password accepted (demo mode)
- **Session Management**: Family ID stored in sessionStorage

### 2. Data Integration

#### Family Members
- Loaded from `active_groups.json` and `upcoming_groups.json`
- Displays real member data: name, age, gender, role
- Professional avatars generated using DiceBear API

#### Trips
- Fetched from both active and upcoming groups
- Shows real trip data: destination, dates, group name
- Status badges: "Active" (green) or "Upcoming" (black)
- Thumbnails mapped to destinations

#### Itineraries
- Loaded from `itinerary_data.json`
- Detailed day-by-day breakdown
- Real event data with times, locations, costs
- Uses the same ItineraryView component as agent dashboard

### 3. Professional Icons
- Removed all cartoonish Icon components
- Replaced with clean SVG icons
- Consistent neuromorphic design throughout

## Demo Family IDs

Test the portal with these Family IDs:

### Active Groups
- **FAM001** - Sharma Family (Goa Beach Retreat)
- **FAM002** - Patel Family (Goa Beach Retreat)
- **FAM007** - Khan Family (Himalayan Adventure Trek)
- **FAM012** - Nair Family (Kerala Backwaters)

### Upcoming Groups
- **FAM019** - Mehta Family (Rajasthan Heritage Tour)
- **FAM025** - Bhatia Family (Shimla Winter Wonderland)
- **FAM032** - Bhatt Family (Andaman Island Paradise)

## File Structure

```
frontend/app/
├── customer-login/
│   ├── page.tsx
│   └── components/
│       └── CustomerLoginInteractive.tsx
└── customer-portal/
    ├── page.tsx
    └── components/
        ├── CustomerPortalInteractive.tsx (data integration)
        ├── FamilyMemberCard.tsx (updated for real data)
        ├── TripCard.tsx (updated for real data)
        ├── DetailedItineraryModal.tsx (real itinerary data)
        ├── AgentChatModal.tsx (professional icons)
        └── PlanTripModal.tsx (professional icons)
```

## Data Flow

1. **Login**: User enters Family ID → Stored in sessionStorage
2. **Portal Load**: 
   - Retrieves Family ID from sessionStorage
   - Searches active_groups.json and upcoming_groups.json
   - Finds family and associated groups
   - Displays family members and trips
3. **View Itinerary**:
   - User clicks "View Itinerary" on trip card
   - Modal fetches data from itinerary_data.json by groupId
   - Transforms data to match ItineraryView format
   - Displays detailed itinerary

## Design System

### Colors
- **Primary Black**: `#212121`
- **Primary White**: `#FDFDFF`
- **Light Gray**: `#EDEDED`
- **Medium Gray**: `#E0E0E0`

### Neuromorphic Shadows
- **Raised**: `shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.9)]`
- **Inset**: `shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.9)]`
- **Strong**: `shadow-[16px_16px_32px_rgba(0,0,0,0.2),-16px_-16px_32px_rgba(255,255,255,0.9)]`

### Icons
All icons are clean SVG paths with professional styling:
- User profile icon
- Location pin icon
- Calendar icon
- Document icon
- Chat icon
- Globe icon
- Checkmark icon
- Close (X) icon
- Arrow icons
- Logout icon

## Navigation Flow

1. Landing Page → "Start as Customer" → Customer Login
2. Customer Login → Enter FAM ID → Customer Portal
3. Customer Portal → View family members and trips
4. Trip Card → "View Itinerary" → Detailed Itinerary Modal
5. Header → "Contact Agent" → Agent Chat Modal
6. Header → "Plan a Trip" → Plan Trip Modal → Trip Request Form
7. Header → "Logout" → Customer Login

## Features

### Family Members Section
- Grid layout (4 columns on desktop)
- Avatar with neuromorphic inset shadow
- Name, role, age, and gender
- Professional card design

### Trips Section
- Separate sections for Active and Upcoming trips
- Trip cards with destination thumbnails
- Status badges with appropriate colors
- Location and date information
- "View Itinerary" button

### Detailed Itinerary Modal
- Full-screen modal with scrollable content
- Uses ItineraryView component
- Shows all days and events
- Event details: time, location, description, cost
- Total cost in footer
- Close button in header and footer

### Agent Chat Modal
- Real-time chat interface
- Message history
- Send messages with Enter key
- Professional message bubbles
- Online status indicator

### Plan Trip Modal
- Feature list with checkmarks
- Call-to-action buttons
- Redirects to trip request form
- Professional icon design

## Security Notes

- Family ID validation (FAM + 3 digits)
- Session-based authentication
- Automatic redirect if not logged in
- Logout clears session

## Future Enhancements

- Real password authentication
- Backend API integration
- Real-time chat with agents
- Trip modification requests
- Payment integration
- Document uploads
- Push notifications
