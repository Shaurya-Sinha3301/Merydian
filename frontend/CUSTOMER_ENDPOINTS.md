# Customer Frontend Endpoints

Complete list of all customer-facing frontend routes in the Meili AI application.

## 🏠 Landing & Authentication

### `/` - Home/Landing Page
- **Component**: `LandingPage`
- **Purpose**: Main landing page for the application
- **File**: [page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/page.tsx)

### `/login` - Login Page
- **Purpose**: Customer authentication
- **File**: [login/page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/login/page.tsx)

### `/signup` - Signup Page
- **Purpose**: New customer registration
- **File**: [signup/page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/signup/page.tsx)

---

## 🗺️ Trip Planning Flow

### `/customer-trip-request` - Create Trip Request
- **Title**: "Create Trip Request - Voyageur"
- **Purpose**: Initial trip creation with guided form
- **Features**:
  - Destination selection
  - Date picker
  - Budget input
  - Group composition
  - Individual preferences
- **Progress Status**: `draft`
- **Component**: `TripRequestInteractive`
- **File**: [customer-trip-request/page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/customer-trip-request/page.tsx)

### `/customer-preferences` - Set Preferences
- **Title**: "Set Your Preferences - Meili AI"
- **Purpose**: Detailed preference collection for personalization
- **Features**:
  - Interest categories
  - Activity preferences
  - Dietary restrictions
  - Accessibility needs
- **Component**: `PreferencesInteractive`
- **File**: [customer-preferences/page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/customer-preferences/page.tsx)

### `/itinerary-selection` - Select Itinerary Type
- **Purpose**: Choose between different itinerary templates or styles
- **File**: [itinerary-selection/page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/itinerary-selection/page.tsx)

---

## 📋 Itinerary Management

### `/customer-itinerary-view` - View & Modify Itinerary
- **Title**: "My Itinerary - TripCraft"
- **Purpose**: Review AI-generated itinerary and request modifications
- **Features**:
  - View complete itinerary
  - Request real-time modifications
  - Instant cost calculations
  - Time estimates
  - Approval workflow
- **Progress Status**: `in-review`
- **Component**: `CustomerItineraryInteractive`
- **File**: [customer-itinerary-view/page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/customer-itinerary-view/page.tsx)

### `/customer-dashboard` - Customer Dashboard ⭐ NEW
- **Purpose**: Main customer dashboard with itinerary overview
- **Features**:
  - Trip timeline view
  - Quick stats (activities, hotels, restaurants)
  - Cost analysis
  - Trip progress indicator
  - **Quick Feedback** component for real-time updates
  - Photo gallery
  - Calendar widget
- **Components**:
  - `DashboardNavbar`
  - `LeftSidebar` - Trip navigation and overview
  - `MainContent` - Timeline and trip details
  - `QuickFeedback` - Real-time feedback input ⭐ NEW
  - `RightSidebar` - Widgets
- **File**: [customer-dashboard/page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/customer-dashboard/page.tsx)

### `/itinerary` - Itinerary Page
- **Purpose**: Alternative itinerary view
- **File**: [itinerary/page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/itinerary/page.tsx)

---

## 🧳 Trip Management

### `/my-trips` - My Trips List
- **Purpose**: View all customer trips (active, upcoming, past)
- **Features**:
  - Trip cards with status badges
  - Quick trip overview
  - "Plan New Trip" button
  - Empty state for new users
- **Sample Trip**: Delhi Grand Tour (March 15-17, 2026)
- **File**: [my-trips/page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/my-trips/page.tsx)

### `/trip/[id]` - Individual Trip Details
- **Purpose**: Detailed view of a specific trip
- **Dynamic Route**: Trip ID parameter
- **File**: [trip/[id]/page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/trip/[id]/page.tsx)

---

## 📍 Points of Interest

### `/poi/[poiId]` - POI Details
- **Purpose**: Detailed information about a specific point of interest
- **Dynamic Route**: POI ID parameter
- **File**: [poi/[poiId]/page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/poi/[poiId]/page.tsx)

### `/map` - Map View
- **Purpose**: Interactive map of trip locations
- **File**: [map/page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/map/page.tsx)

---

## 📊 Additional Pages

### `/bookings` - Bookings Management
- **Purpose**: Manage hotel, flight, and activity bookings
- **File**: [bookings/page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/bookings/page.tsx)

### `/analytics` - Analytics Dashboard
- **Purpose**: Trip analytics and insights
- **File**: [analytics/page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/analytics/page.tsx)

### `/dashboard` - General Dashboard
- **Purpose**: Alternative dashboard view
- **File**: [dashboard/page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/dashboard/page.tsx)

---

## 🎯 Demo Pages (For Testing)

### `/demo` - Demo Landing
- **Purpose**: Demo mode entry point
- **File**: [demo/page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/demo/page.tsx)

### `/demo/families` - Demo Families List
- **Purpose**: View demo family data
- **File**: [demo/families/page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/demo/families/page.tsx)

### `/demo/family/[id]` - Demo Family Details
- **Purpose**: Individual demo family view
- **File**: [demo/family/[id]/page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/demo/family/[id]/page.tsx)

### `/demo/analytics` - Demo Analytics
- **Purpose**: Demo analytics dashboard
- **File**: [demo/analytics/page.tsx](file:///d:/Coding/Voyage/meiliai/frontend/app/demo/analytics/page.tsx)

---

## 🔧 Agent Pages (Not Customer-Facing)

These are for internal/agent use, not customer-facing:

- `/agent/dashboard` - Agent dashboard
- `/agent-dashboard` - Agent group dashboard
- `/agent-dashboard/[groupId]` - Agent group details
- `/agent-request-review` - Agent request review
- `/optimizer` - Optimizer interface

---

## 🚀 Recommended Customer Journey

1. **`/`** → Landing page
2. **`/signup`** or **`/login`** → Authentication
3. **`/customer-trip-request`** → Create trip request
4. **`/customer-preferences`** → Set preferences
5. **`/itinerary-selection`** → Choose itinerary type
6. **`/customer-itinerary-view`** → Review AI-generated itinerary
7. **`/customer-dashboard`** → Manage active trip with real-time feedback ⭐
8. **`/my-trips`** → View all trips
9. **`/trip/[id]`** → View specific trip details

---

## ⭐ NEW: Real-Time Feedback Feature

Available on **`/customer-dashboard`** in the right sidebar:

**Quick Feedback Component** allows customers to:
- Type natural language requests (e.g., "add qutub minar")
- Click suggestion buttons for common actions
- See instant itinerary updates with animations
- Get visual feedback with "NEW" badges on added items

**Supported Actions:**
- `add [location]` - Add a location to the itinerary
- `remove [location]` - Remove a location from the itinerary

**Backend Endpoint:** `/api/v1/demo/feedback`

---

## 📱 Access URLs

When running locally:
- **Primary**: `http://localhost:3000/[route]`
- **Alternate**: `http://localhost:3001/[route]` (if port 3000 is in use)

Example:
- Dashboard: `http://localhost:3000/customer-dashboard`
- My Trips: `http://localhost:3000/my-trips`
- Create Trip: `http://localhost:3000/customer-trip-request`
