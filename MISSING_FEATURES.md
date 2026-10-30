# Missing Features for a Production Demo

*Note: Only features that genuinely do not exist are listed here. Everything else is assumed implemented based on the project inventory.*

## Backend
1. **End-to-End Database Seed Command**: A mechanism that goes beyond just saving deterministic demo outputs as JSON (`generate_demo_data.py`). We are missing a script that reads these `_trip.json` files and actually provisions full PostgreSQL database records (Users, Families, Trips, Itineraries, Preferences) so the regular endpoints naturally return this data.
2. **WebSocket Publisher Hooks**: While `main.py` has WebSocket endpoints, there is no apparent active dispatcher calling `ws_manager.send_to_user` upon optimizer completion to actively drive the UI.

## Frontend
1. **Dynamic Trip Resolution in Overview**: `TripOverviewPage.tsx` currently hardcodes fallback IDs (`actualTripId = tripId || 'default-trip'`) and has dummy data (e.g. `budget: { total: 10000...}`). It needs to rely fully on backend data.
2. **Demo Persona Selector UI**: There is no UI for a demonstrator to easily switch between "Family Vacation", "Luxury Couple", etc., and inject that persona's data into their session.
3. **WebSocket Client Subscriptions**: The frontend services/stores do not yet subscribe to the `/ws/traveller/{user_id}` or `/ws/agent/{agent_id}` endpoints for real-time reactivity when a Celery job finishes.

## Database
1. **User / Family Seed Mapping**: The generated JSONs contain pseudo `family_id`s (e.g., `"DEMO_FAM_VACATION"`), but these do not exist in the `users` or `families` PostgreSQL tables yet. A script is missing to bridge the gap between `generate_demo_data.py` output and valid foreign key relational integrity.
