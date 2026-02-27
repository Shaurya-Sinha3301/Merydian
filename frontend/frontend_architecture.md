# MerYDiaN — Frontend Architecture & Backend Integration Guide

> **Framework**: Next.js 15 (App Router) · **Styling**: Tailwind CSS · **Auth State**: React Context (`contexts/AuthContext.tsx`)  
> **API Client**: `services/api.ts` → `http://localhost:8000/api/v1`

---

## Table of Contents
1. [Landing Page Workflow](#1-landing-page-workflow)
2. [Customer Workflow (Full Flow)](#2-customer-workflow-full-flow)
3. [Travel Agent Workflow (Full Flow)](#3-travel-agent-workflow-full-flow)
4. [Signup Flow](#4-signup-flow)
5. [API Client — All Backend Endpoints](#5-api-client--all-backend-endpoints)
6. [Data Sources — Mock vs Backend](#6-data-sources--mock-vs-backend)
7. [Storage Keys Reference](#7-storage-keys-reference)
8. [Placeholder Routes (Not Functional)](#8-placeholder-routes-not-functional)
9. [Demo Section](#9-demo-section)

---

## 1. Landing Page Workflow

**Route**: `/`  
**Page file**: `frontend/app/page.tsx`  
**Renders**: `<LandingPage />` from `frontend/components/LandingPage.tsx`

```
Landing Page (/)
│
├── Header (components/landing/Header.tsx)
│     ├── Logo link → / (home)
│     ├── Anchor links: #features, #analytics, #ai-support, #pricing
│     ├── Button: "Login as Customer" → /customer-login
│     └── Button: "Login as Agent" → /agent-login
│
├── HeroSection (components/landing/HeroSection.tsx)
│     └── Parallax frame animation (reads images from public/)
│
├── FeaturesSection (components/landing/FeaturesSection.tsx)
│     └── Feature cards (static, no navigation)
│
├── AnalyticsSection (components/landing/AnalyticsSection.tsx)
│     └── Analytics demo visuals (static)
│
├── AISupportSection (components/landing/AISupportSection.tsx)
│     └── AI capabilities showcase (static)
│
├── TestimonialSection (components/landing/TestimonialSection.tsx)
│     └── User testimonials (static)
│
├── PricingSection (components/landing/PricingSection.tsx)
│     └── Pricing tiers (static)
│
└── Footer (components/landing/Footer.tsx)
      ├── Anchor links: #features, #analytics, #ai-support, #pricing
      ├── Link: "Customer Login" → /customer-login
      ├── Link: "Agent Login" → /agent-login
      └── Static: Contact, Careers, Press, Socials, Privacy, Terms
```

**Backend needed**: None. Fully static marketing page.

---

## 2. Customer Workflow (Full Flow)

### Step 1: Customer Login

**Route**: `/customer-login`  
**Page file**: `frontend/app/customer-login/page.tsx`  
**Renders**: `<CustomerLoginInteractive />` from `frontend/app/customer-login/components/CustomerLoginInteractive.tsx`

| Field | Details |
|-------|---------|
| Input | `familyId` (format: `FAM001`), `password` |
| Validation | Regex `/^FAM\d{3}$/i`, password must not be empty |
| On submit | Stores `familyId` in **sessionStorage** |
| Redirect | → `/customer-preference` |
| Links | "Contact your travel agent" (dead link), "Return to Hub" → `/` |

**⚡ Backend needed**: Currently **no actual auth** — only validates format client-side. Backend should provide:
- `POST /auth/login` — validate familyId + password, return JWT
- Customer role should grant access to `/customer-*` routes

---

### Step 2: Interest Calibration (Preference Selection)

**Route**: `/customer-preference`  
**Page file**: `frontend/app/customer-preference/page.tsx`  
**Renders**: `<PreferenceBuilderInteractive />` from `frontend/app/customer-preference/components/PreferenceBuilderInteractive.tsx`

| Aspect | Details |
|--------|---------|
| Auth check | Reads `familyId` from sessionStorage. If missing → redirect to `/customer-login` |
| Data source | **JSON files**: `active_groups.json`, `upcoming_groups.json`, `itinerary_data.json` (all from `frontend/lib/agent-dashboard/data/`) |
| Logic | Looks up family by ID in groups data, gets destination metadata |
| User action | Select exactly 5 experience cards from a catalogue of 10 |
| On save | Stores `preferenceVectors` (array of selected IDs) in **sessionStorage** |
| Redirect | → `/customer-dashboard` |

**⚡ Backend needed**:
- `GET /families/{familyId}` — fetch family details and group assignment
- `GET /families/{familyId}/preferences` — fetch existing preferences
- `PUT /families/{familyId}/preferences` — save selected preference vectors
- Replace JSON file lookups with API calls

---

### Step 3: Customer Dashboard

**Route**: `/customer-dashboard`  
**Page file**: `frontend/app/customer-dashboard/page.tsx`  
**Renders**: `<CustomerDashboardInteractive />` from `frontend/app/customer-dashboard/components/CustomerDashboardInteractive.tsx`

| Aspect | Details |
|--------|---------|
| Auth check | Reads `familyId` from sessionStorage. If missing → redirect to `/customer-login` |
| Data source | **JSON files**: `active_groups.json`, `upcoming_groups.json` |
| Sidebar | `<CustomerSidebar />` from `frontend/app/components/CustomerSidebar.tsx` |

**Layout**: 3-column layout:
1. **Left**: Hero image + Timeline events (hardcoded static data)
2. **Center**: Chat panel with mock agent (AGENT_04) — messages stored in local state
3. **Right**: Travel Vault (static booking cards) + Today's Brief + Assigned Agent info

**Navigation from this page**:
| Action | Destination |
|--------|-------------|
| "Full Itinerary →" button | `/customer-portal` |
| "View" on notification | `/customer-portal` |
| "View 'Why' Analysis" on timeline | `/customer-portal` |
| "All Bookings →" button | `/customer-bookings` |
| Sidebar: HUB | `/customer-dashboard` (current) |
| Sidebar: PLAN | `/customer-portal` |
| Sidebar: DOCS | `/customer-bookings` |
| Sidebar: Logout | Clears `familyId` → `/customer-login` |

**⚡ Backend needed**:
- `GET /families/{familyId}/timeline` — fetch today's timeline events
- `GET /families/{familyId}/bookings` — fetch travel vault items
- `POST /chat/messages` + `GET /chat/messages` — agent chat messaging (or WebSocket)
- `GET /families/{familyId}/notifications` — live notifications

---

### Step 4: Customer Portal (Itinerary View)

**Route**: `/customer-portal`  
**Page file**: `frontend/app/customer-portal/page.tsx`  
**Renders**: `<EnhancedCustomerPortalInteractive />` from `frontend/app/customer-portal/components/EnhancedCustomerPortalInteractive.tsx`

| Aspect | Details |
|--------|---------|
| Auth check | Reads `familyId` from sessionStorage. If missing → redirect to `/customer-login` |
| Data source | **JSON files**: `active_groups.json`, `upcoming_groups.json`, `itinerary_data.json` |
| Sidebar | `<CustomerSidebar activeTab="portal" />` |

**What it shows**: Full day-by-day itinerary timeline with expandable event cards showing:
- Event details (time, duration, type, status, description)
- Provider/guide information and booking references
- Disruption alerts with "Why?" analysis modal
- AI-recommended POI additions (Accept/Decline actions)
- Day navigation (sidebar with day numbers + prev/next buttons)

**Navigation from this page**:
| Action | Destination |
|--------|-------------|
| "← MY BOOKINGS" header button | `/customer-bookings` |
| Back button (←) | `router.back()` |
| "← BACK" (when no itinerary) | `/customer-login` |

**Sub-components** (all in `frontend/app/customer-portal/components/`):
- `WhyButton` — triggers optimization analysis modal
- Inline event cards, disruption banners, AI POI suggestion cards

**⚡ Backend needed**:
- `GET /itineraries/{itineraryId}` — fetch full itinerary with days and events
- `POST /itineraries/{itineraryId}/poi/accept` — accept AI suggestion
- `POST /itineraries/{itineraryId}/poi/decline` — decline AI suggestion
- Disruption data should come from itinerary events

---

### Step 5: Customer Bookings

**Route**: `/customer-bookings`  
**Page file**: `frontend/app/customer-bookings/page.tsx`  
**Renders**: Self-contained page + sub-components

| Aspect | Details |
|--------|---------|
| Data source | **JSON files**: `itinerary_data.json`, `active_groups.json`, `upcoming_groups.json` |
| Sidebar | `<CustomerSidebar activeTab="bookings" />` |

**Sub-components** (in `frontend/app/customer-bookings/components/`):
- `BookingCard.tsx` — individual booking display
- `BookingDetailsModal.tsx` — expanded booking details modal

**Features**: Filter by type (flight, hotel, transport, meal, activity) and status (confirmed, pending, cancelled)

**⚡ Backend needed**:
- `GET /families/{familyId}/bookings?type=&status=` — fetch filtered bookings

---

### Other Customer Routes

| Route | File | Component | Data | Backend Need |
|-------|------|-----------|------|-------------|
| `/customer-trip-request` | `frontend/app/customer-trip-request/page.tsx` | `<CustomerProgressIndicator />` + `<TripRequestInteractive />` | Multi-step wizard form | `POST /trips/request` — submit trip request |
| `/customer-itinerary-view` | `frontend/app/customer-itinerary-view/page.tsx` | `<CustomerProgressIndicator />` + `<CustomerItineraryInteractive />` | Itinerary review | `GET /itineraries/{id}` — fetch itinerary for review |
| `/customer-itinerary/[tripId]` | `frontend/app/customer-itinerary/[tripId]/page.tsx` | `<ItineraryView />` from `components/itinerary/` | Fetches from JSON | `GET /itineraries/{tripId}` — specific itinerary |
| `/itinerary-selection` | `frontend/app/itinerary-selection/page.tsx` | Self-contained | Static curated options | Selection triggers → `/customer-trip-request` |
| `/trip/[id]` | `frontend/app/trip/[id]/page.tsx` | `<TripHeader />` + `<AgentChatPanel />` | Trip+chat | `GET /trips/{id}`, WebSocket for chat |

**Trip Request sub-components** (in `frontend/app/customer-trip-request/components/`):
- `DestinationSelector.tsx` — Step 1: choose destination
- `DateRangePicker.tsx` — Step 2: pick dates
- `BudgetRangeSlider.tsx` — Step 3: set budget
- `GroupComposition.tsx` — Step 4: family members
- `TravelerPreferences.tsx` — Step 5: travel style
- `PlacePreferences.tsx` — Step 6: place preferences
- `ProgressIndicator.tsx` — step progress bar

---

## 3. Travel Agent Workflow (Full Flow)

### Step 1: Agent Login

**Route**: `/agent-login`  
**Page file**: `frontend/app/agent-login/page.tsx`  
**Renders**: `<AgentLoginInteractive />` from `frontend/app/agent-login/components/AgentLoginInteractive.tsx`

| Field | Details |
|-------|---------|
| Input | `email` (username/email), `password` |
| Validation | Both fields required |
| On submit | Stores `agentEmail` in **sessionStorage** |
| Redirect | → `/agent-dashboard/itinerary-management` |
| Links | "Apply now" → `/signup`, "Return to Hub" → `/`, "FORGOT PASSWORD?" (dead link) |

**⚡ Backend needed**: Same as customer — currently no real auth.
- `POST /auth/login` — validate agent credentials, return JWT with agent role

---

### Step 2: Itinerary Management (Trip List)

**Route**: `/agent-dashboard/itinerary-management`  
**Page file**: `frontend/app/agent-dashboard/itinerary-management/page.tsx`  
**Renders**: `<NavigationBreadcrumbs />` + `<ItineraryOptimizerWindow />`

**Component file**: `frontend/components/itinerary/ItineraryOptimizerWindow.tsx`

| Aspect | Details |
|--------|---------|
| Data source | **Tries API first**: `apiClient.getAgentTrips()` → fallback to `MOCK_TRIPS` from `lib/trips.ts` |
| Also loads | `sessionStorage.getItem('builtTrips')` — locally created trips |
| Features | Trip card grid, filter by status (All/Approved/In Review/Draft/Cancelled), search by PNR/client |

**Navigation from this page**:
| Action | Destination |
|--------|-------------|
| Click on a trip card | `/agent-dashboard/itinerary-management/{tripId}` |
| "+" button (create new) | `/agent-dashboard/itinerary-builder` |
| Delete button on card | Removes from local state + sessionStorage |

**⚡ Backend needed**:
- `GET /trips?limit=&skip=&status=` — list agent trips (already partially integrated!)
- `DELETE /trips/{id}` — delete a trip

---

### Step 3: Trip Detail View (Tabs)

**Route**: `/agent-dashboard/itinerary-management/[tripId]`  
**Layout file**: `frontend/app/agent-dashboard/itinerary-management/[tripId]/layout.tsx`  
**Wraps all sub-pages with**: `<NavigationBreadcrumbs />` + `<TripDetailNavbar tripId={tripId} />`

**TripDetailNavbar** (`frontend/components/itinerary/TripDetailNavbar.tsx`) provides tab navigation:

| Tab | Route | Page File | Component |
|-----|-------|-----------|-----------|
| **Optimization** | `…/[tripId]` | `…/[tripId]/page.tsx` | `<ItineraryDetailView />` |
| **Groups** | `…/[tripId]/groups` | `…/[tripId]/groups/page.tsx` | `<GroupsView />` |
| **Bookings** | `…/[tripId]/bookings` | `…/[tripId]/bookings/page.tsx` | `<BookingsView />` |
| **Intelligence** | `…/[tripId]/intelligence` | `…/[tripId]/intelligence/page.tsx` | `<IntelligenceView />` |

**Back button** in TripDetailNavbar → `/agent-dashboard/itinerary-management`

All tab components are from `frontend/components/itinerary/`:
- `ItineraryDetailView.tsx` — day-by-day timeline with drag-to-edit, VoyageurAI chat panel
- `GroupsView.tsx` — family/group management  
- `BookingsView.tsx` — booking management with TicketModal
- `IntelligenceView.tsx` — analytics charts (uses `components/charts/*`)

**Intelligence charts** (`frontend/components/charts/`):
- `DisruptionImpactChart.tsx`
- `FamilyAnalysisRadarChart.tsx`
- `FamilyCostStackedChart.tsx`
- `PersonalizationProfitChart.tsx`

**⚡ Backend needed**:
- `GET /trips/{tripId}` — trip metadata
- `GET /trips/{tripId}/itinerary` — full itinerary for optimization view
- `GET /trips/{tripId}/groups` — family/group list
- `GET /trips/{tripId}/bookings` — bookings list
- `GET /trips/{tripId}/analytics` — intelligence data for charts
- `PUT /trips/{tripId}/itinerary` — save itinerary modifications
- `POST /trips/{tripId}/ai-feedback` — VoyageurAI agent feedback

---

### Step 4: Itinerary Builder (New Trip)

**Two entry points for creating trips:**

#### A. Itinerary Builder

**Route**: `/agent-dashboard/itinerary-builder`  
**Page file**: `frontend/app/agent-dashboard/itinerary-builder/page.tsx`  
**Renders**: `<NavigationBreadcrumbs />` + `<ItineraryBuilderView />` from `frontend/components/itinerary/ItineraryBuilderView.tsx`

#### B. New Trip (Inline Form)

**Route**: `/agent-dashboard/itinerary-management/new`  
**Page file**: `frontend/app/agent-dashboard/itinerary-management/new/page.tsx`  
**Renders**: Self-contained form with families, trip overview, day/event builder
**On save**: Stores trip in `sessionStorage.setItem('builtTrips', ...)` and in `localStorage.setItem('agent_mock_trips', ...)`

**⚡ Backend needed**:
- `POST /trips` — create trip with families and itinerary
- `POST /trips/initialize-with-optimization` — create trip + auto-optimize (already in API client!)

---

### Other Agent Routes

| Route | File | Component | Description | Backend Need |
|-------|------|-----------|-------------|-------------|
| `/agent-request-review` | `frontend/app/agent-request-review/page.tsx` | `<AgentWorkflowTabs />` + `<NavigationBreadcrumbs />` + `<AgentRequestReviewInteractive />` | Review customer trip requests | `GET /trips/requests`, `PUT /trips/requests/{id}/approve` |
| `/optimizer` | `frontend/app/optimizer/page.tsx` | `<EditorInteractive />` | Detailed itinerary editor | Same itinerary endpoints |
| `/analytics` | `frontend/app/analytics/page.tsx` | `<Sidebar />` + `<NavigationBreadcrumbs />` + inline stats | Analytics dashboard | `GET /analytics/summary` |

**Optimizer sub-components** (in `frontend/app/optimizer/components/`):
- `EditorInteractive.tsx` — main editor with timeline, activity library, cost analysis
- `ActivityLibrary.tsx` — searchable activity catalogue
- `ComparisonView.tsx` — before/after itinerary comparison
- `CostAnalysisPanel.tsx` — cost breakdown panel
- `ItineraryTimeline.tsx` — visual timeline editor

---

## 4. Signup Flow

**Route**: `/signup`  
**Page file**: `frontend/app/signup/page.tsx`  
**Renders**: Self-contained inline form

| Field | Details |
|-------|---------|
| User type toggle | Customer / Agent |
| Fields | Full name, email, password, confirm password |
| On submit | Calls `signup()` from `AuthContext` |
| Redirect | Agent → `/agent-dashboard`, Customer → `/customer-portal` |
| Links | "Return to Home" → `/` |

**⚡ Backend needed**: `POST /auth/signup` (already in API client)

---

## 5. API Client — All Backend Endpoints

**File**: `frontend/services/api.ts`  
**Base URL**: `NEXT_PUBLIC_API_URL` env var or `http://localhost:8000/api/v1`  
**Auth**: JWT token stored in `localStorage('access_token')`

| Method | Endpoint | Used By |
|--------|----------|---------|
| `login()` | `POST /auth/login` | AuthContext |
| `signup()` | `POST /auth/signup` | AuthContext |
| `refreshToken()` | `POST /auth/refresh` | AuthContext (auto every 25min) |
| `logout()` | `POST /auth/logout` | AuthContext |
| `logoutAll()` | `POST /auth/logout-all` | — |
| `processAgentFeedback()` | `POST /agent/feedback` | VoyageurAI chat |
| `getCurrentItinerary()` | `GET /itinerary/current` | Customer itinerary view |
| `submitFeedback()` | `POST /feedback` | POI feedback |
| `requestPOI()` | `POST /poi/request` | Customer POI request |
| `initializeTrip()` | `POST /trips/initialize` | Trip creation |
| `initializeTripWithOptimization()` | `POST /trips/initialize-with-optimization` | Trip creation + ML |
| `getAgentItineraryOptions()` | `GET /agent/events/{eventId}/options` | Agent dashboard |
| `approveOption()` | `POST /agent/options/{optionId}/approve` | Agent approval |
| `getFamilyPreferences()` | `GET /family/preferences` | Preference page |
| `updateFamilyPreferences()` | `PATCH /family/preferences` | Preference update |
| `getAgentTrips()` | `GET /trips?limit=&skip=&status=` | Itinerary management |
| `getItineraryDiff()` | `GET /itinerary/diff?a=&b=` | Version comparison |
| `submitFeedbackMessage()` | `POST /agent/feedback` | Suggest change modal |
| `getFamilyEvents()` | `GET /families/{familyId}/events` | Customer suggestions panel |

---

## 6. Data Sources — Mock vs Backend

| Data | Current Source | Location | Replace With |
|------|---------------|----------|-------------|
| Active groups | JSON import | `frontend/lib/agent-dashboard/data/active_groups.json` | `GET /groups?status=active` |
| Upcoming groups | JSON import | `frontend/lib/agent-dashboard/data/upcoming_groups.json` | `GET /groups?status=upcoming` |
| Itinerary timeline | JSON import | `frontend/lib/agent-dashboard/data/itinerary_data.json` | `GET /itineraries/{id}` |
| Trip list (mock) | TypeScript const | `frontend/lib/trips.ts` (MOCK_TRIPS) | `GET /trips` (already partially done) |
| Experience catalogue | Hardcoded array | Inside `PreferenceBuilderInteractive.tsx` | `GET /experiences` |
| AI POI suggestions | Hardcoded object | Inside `EnhancedCustomerPortalInteractive.tsx` | `GET /itineraries/{id}/suggestions` |
| Timeline events | Hardcoded array | Inside `CustomerDashboardInteractive.tsx` | `GET /families/{id}/timeline` |
| Chat messages | Local state | Inside `CustomerDashboardInteractive.tsx` | WebSocket or `GET/POST /chat/messages` |
| Built trips | sessionStorage | `builtTrips` key | `POST /trips` → `GET /trips` |

---

## 7. Storage Keys Reference

### sessionStorage (cleared on tab close)

| Key | Set By | Used By | Value |
|-----|--------|---------|-------|
| `familyId` | Customer Login | Preference, Dashboard, Portal, Bookings | e.g. `"FAM001"` |
| `familyName` | — | CustomerSidebar | Family name string |
| `agentEmail` | Agent Login | — | Agent email/username |
| `preferenceVectors` | Preference Builder | — | JSON array of IDs |
| `builtTrips` | New Trip Form | ItineraryOptimizerWindow | JSON array of Trip objects |
| `familyGroupMap` | Customer Login | Bookings | Group mapping |

### localStorage (persists)

| Key | Set By | Used By | Value |
|-----|--------|---------|-------|
| `access_token` | AuthContext / API client | All API calls | JWT string |
| `agent_mock_trips` | New Trip Form | — | JSON trips backup |

---

## 8. Placeholder Routes (Not Functional)

These routes exist as files but only display "Coming soon..." text with no actual functionality:

| Route | File |
|-------|------|
| `/dashboard` | `frontend/app/dashboard/page.tsx` |
| `/bookings` | `frontend/app/bookings/page.tsx` |
| `/itinerary` | `frontend/app/itinerary/page.tsx` |
| `/map` | `frontend/app/map/page.tsx` |
| `/agent/dashboard` | `frontend/app/agent/dashboard/page.tsx` |
| `/poi/[poiId]` | `frontend/app/poi/[poiId]/page.tsx` |
| `/neumorphic-demo` | `frontend/app/neumorphic-demo/page.tsx` |
| `/login` | `frontend/app/login/page.tsx` (generic, unused) |

> **Note**: These are likely legacy or future routes. The active login routes are `/customer-login` and `/agent-login`.

---

## 9. Demo Section

**Layout**: `frontend/app/demo/layout.tsx` — provides `<Sidebar />` + `<TopNav />` from `components/demo/`

| Route | File | Component |
|-------|------|-----------|
| `/demo` | `frontend/app/demo/page.tsx` | `<Dashboard />` from `components/demo/pages/Dashboard` |
| `/demo/analytics` | `frontend/app/demo/analytics/page.tsx` | Demo analytics |
| `/demo/families` | `frontend/app/demo/families/page.tsx` | Demo families list |
| `/demo/family/[id]` | `frontend/app/demo/family/[id]/page.tsx` | Demo family detail |

**Backend needed**: None. Demo-only with isolated layout.

---

## Visual Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    LANDING PAGE (/)                               │
│  Header: [Login Customer] [Login Agent]                          │
└──────────┬────────────────────────────┬──────────────────────────┘
           │                            │
           ▼                            ▼
┌──────────────────────┐    ┌──────────────────────┐
│  /customer-login     │    │  /agent-login         │
│  (FamilyID + Pass)   │    │  (Email + Pass)       │
│  stores: familyId    │    │  stores: agentEmail   │
│  → /signup (link)    │    │  → /signup (link)     │
└──────────┬───────────┘    └──────────┬────────────┘
           │                            │
           ▼                            ▼
┌──────────────────────┐    ┌───────────────────────────────────┐
│  /customer-preference│    │  /agent-dashboard/                │
│  Select 5 interests  │    │     itinerary-management          │
│  stores: prefs       │    │  (Trip card grid, search, filter) │
│  → /customer-dash    │    └──┬─────────┬──────────────────────┘
└──────────┬───────────┘       │         │
           │                   │         │ Click "+"
           ▼                   │         ▼
┌──────────────────────┐       │    ┌──────────────────────┐
│  /customer-dashboard │       │    │ /agent-dashboard/    │
│  Sidebar: HUB|PLAN|  │       │    │ itinerary-builder    │
│           DOCS        │       │    └──────────────────────┘
│  Timeline + Chat +   │       │
│  Travel Vault        │       │ Click trip card
│  → /customer-portal  │       ▼
│  → /customer-bookings│  ┌──────────────────────────────────┐
└──────────┬───────────┘  │ /agent-dashboard/                │
           │              │   itinerary-management/[tripId]   │
           ▼              │ ┌────────────────────────────────┐│
┌──────────────────────┐  │ │ Tabs:                          ││
│  /customer-portal    │  │ │ Optimization | Groups |        ││
│  Day-by-day itinerary│  │ │ Bookings | Intelligence        ││
│  Event detail cards  │  │ └────────────────────────────────┘│
│  AI POI suggestions  │  └──────────────────────────────────┘
│  "Why?" modal        │
│  → /customer-bookings│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  /customer-bookings  │
│  Filter by type/     │
│  status              │
│  BookingDetailsModal │
└──────────────────────┘
```
