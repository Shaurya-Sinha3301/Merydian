# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing codebase: `frontend V2/` (Vite, React 19, TypeScript, Tailwind CSS 4, React Router 7, Zustand, TanStack Query, Axios). This is the confirmed target UI. The older Next.js app in `frontend/` is not the design target.

## Users

Two audiences of equal priority (confirmed):
- **Travel agents**: review AI-generated itinerary options, approve or reject them, watch optimization jobs, manage bookings and customers (human-in-the-loop).
- **Travellers / families**: members of multi-family group trips who view the itinerary and timeline, give feedback, request points of interest, and see explanations for changes.

## Product Purpose

MerYDiaN is an agentic travel coordination platform for multi-family group trips. Constraint-based optimization (OR-Tools CP-SAT) builds a shared itinerary from each family's preferences, LLM agents turn feedback and real-time events into updated constraints, and agents approve changes before bookings run. Success is a trip plan that all families can understand and trust, with every change explained.

## Positioning

It optimizes one itinerary across several families with different preferences and budgets, then explains every change as a diff with a reason. A generic trip planner serves one traveller and gives no account of why the plan changed.

## Operating Context

Optimizer runs are asynchronous (Celery + Redis) and results arrive as new itinerary versions with diffs and explanations; progress and completion are delivered over WebSockets. Hotel and air booking go through the TBO APIs. A demo launcher provides five personas (Family Vacation, Luxury Couple, Budget Backpacker, Elderly Travelers, Accessibility Trip).

## Capabilities and Constraints

- Auth with JWT; roles include agent and customer.
- Trips, families, preferences, versioned itineraries, timeline, diff, explainability, feedback, POI requests, bookings, flights, agent dashboard, jobs, demo launcher, health checks.
- The frontend and backend routes are not yet fully matched (the frontend calls `/api/optimizations/*` and `/api/trips/{id}/feedback`, which the backend does not expose); the UI must work from real backend data, not placeholders.
- Undecided: tenancy for multiple agencies; opening-hours and time-window constraints in the optimizer.

## Brand Commitments

Name is "MerYDiaN" (also written Merydian in code). The backend and Docker setup use the internal name "MeiliAI". No logo, palette or voice has been confirmed as binding. Not decided here.

## Evidence on Hand

Five demo persona trips in `backend/demo_data/*_trip.json`, optimizer datasets in `ml_or/data`, API contracts in `contracts/`, and architecture docs at the repo root. There are no real customers, testimonials, pricing or usage metrics; do not fabricate any.

## Product Principles

1. **Explain every change.** Anything the AI alters shows what changed and why.
2. **Human approves.** Agents decide; the UI never implies an automatic commitment of bookings.
3. **Real data only.** No placeholder trips, budgets or sample itineraries presented as real.
4. **Two audiences, one trip.** Agent and traveller views describe the same trip state and stay consistent.
5. **Show progress honestly.** Long optimizer jobs show real status, failure and retry states.

## Accessibility & Inclusion

One demo persona is "Accessibility Trip" and another is "Elderly Travelers", so itineraries and the UI should not assume mobility or age. No formal standard has been stated; WCAG AA is a reasonable working target (inferred, unconfirmed).

<!-- Assumption notes: the project is portfolio/academic (confirmed by the user); no launch, pricing or deployment claims are made. -->
