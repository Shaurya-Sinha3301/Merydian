# Merydian: how it can be used, and what can be taken out of it

Merydian plans one trip for several families at once, lets travellers change it in plain words, and keeps a travel agent in the loop for every decision. This note says what it can do today, where each headline claim lives in the code, who could use it, and which parts stand on their own.

## 1. What is real today

| Claim | Where it lives | State |
|---|---|---|
| Baseline plus branch planning: one shared itinerary evolves into family-specific plans | `ml_or/itinerary_optimizer.py`, `ItineraryService.publish_base_itinerary`, the **Group** tab on a trip | The optimizer plans every family together. Each family gets its own stored branch, and the Group tab shows what is shared and what is not. In practice most stops are shared; branches appear only when a family's plan genuinely differs. |
| Background pipeline: Celery workers, Redis, no polling, no duplicate processing | `backend/app/worker.py`, `app/workers/agent_tasks.py`, `app/core/websocket.py` (Redis pub/sub bridge), `AgentJobService` | Jobs run in Celery with retries and a status trail. The browser is pushed updates over **server-sent events** (`/notifications/stream`) which read the notification table every 2 seconds. The Redis pub/sub to WebSocket bridge exists but the new UI does not use it yet (see roadmap). |
| 10,000 simulated scenarios, 144 ms median solve | `backend/scripts/benchmark/` (`resume_metrics.json`) | Real and reproducible. Shown live on the **Agents** tab, beside the whole-job time seen here (about 38 s, dominated by the language model). |
| Caching: in-memory plus shared Redis | `app/api/itinerary.py` (Redis cache of the current itinerary) | Present for the current-itinerary read. Not yet used elsewhere. |

## 2. What each side can do now

**Traveller (customer)**
- Plan a Delhi trip from dates, party, interests, pace and budget; read it as a timetable with a real map.
- Send feedback in plain words and see exactly what changed and why, with cost and fit per version.
- Ask for a specific place; an agent accepts or declines it.
- Group trips: see every family's plan and what is shared.
- Bookings the agent recorded; live notifications; **Add to calendar (.ics)** and **Print**.

**Travel agent**
- Desk: accept or decline first plans and change requests, comparing options on cost and fit.
- Customers: add families, edit their saved preferences, plan single or group trips.
- Overview, Calendar, Insights (business metrics), per-trip History, Bookings ledger.
- Agents tab: the AI agents, their reliability, the live job feed and the optimizer benchmark.
- Notes and tasks per trip, with an open-task list on the Overview.
- Webhooks (signed, retried, logged) and **CSV export** of trips, customers, bookings and trip performance.

## 3. Who could use it

1. **Small travel agencies and DMCs** running family and group tours: the Desk and Insights replace spreadsheets and chat threads.
2. **Group-trip organisers** (extended families, reunions, destination weddings): several households, one plan, each with their own limits.
3. **Corporate offsites and school trips**: one coordinator, many travellers with different needs and budgets.
4. **Accessibility and senior-travel specialists**: preferences like pace and mobility drive the plan, and every change is explained.
5. **Destination marketing teams** that want a planner on their own data: replace `ml_or/data` with their places.

## 4. Parts that can be taken out and reused

| Module | What it is | How to extract |
|---|---|---|
| **Itinerary engine** | CP-SAT multi-family, multi-day optimizer with the 10,000-scenario benchmark | Wrap `ItineraryOptimizer` in its own small API (`POST /solve`); ship the benchmark runner as its regression suite. |
| **Explanation pipeline** | Diff, causal tagging, cost delta, LLM sentence per change | Already a self-contained class (`FeedbackProcessor`); expose `POST /explain` taking two itineraries. |
| **Human-in-the-loop decisions** | Options with cost and fit, accept or decline, audit trail | `ItineraryOptionDB` plus `/agent/decisions` is generic: any "AI proposes, a person approves" flow can use it. |
| **Notifications and webhooks** | Per-user inbox, live stream, signed webhooks with retries and a delivery log | `notification_service.py` has no trip logic; lift it as a package. |
| **Agent job runner** | Queued jobs with status, retries and events | `AgentJobService` and the Agents tab work for any Celery-backed agent. |

## 5. Done since the first version of this note

| Item | Where |
|---|---|
| Live updates pushed over Redis pub/sub, not read on a timer | `notification_service._push`, `/notifications/stream` waits on `notif:<user>`; an event reaches an open stream in under 100 ms |
| Family-specific feedback: one family's change only edits its branch | `agent_tasks.py` publishes to the asking family; the Group tab shows the divergence |
| Password reset and invitations | `/auth/forgot`, `/auth/reset`, invite links emailed when an agent adds a customer |
| Email and SMS notifications, per person and per event | `message_service.py` (SMTP and Twilio), the Settings page; without credentials messages are recorded as "logged" so every flow can still be tried |
| Agencies: each agency sees only its own customers, trips, bookings and metrics | `agency_service.py`; agents start or join an agency at sign-up; customers join with the agency code |
| Personal API keys for agents | Settings, `mk_...` bearer keys work on every agent endpoint |
| Group expenses (equal split, who pays whom) and a shared checklist | the Group tab |

To send real messages, set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` and `FRONTEND_URL` (email) and `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` (SMS) on the backend. Nothing else changes.

## 6. Roadmap

**Next**
- Supplier booking behind the ledger, once supplier credentials exist.
- Per-family opening hours and travel-time rules shown when the optimizer cannot fit a request.
- A weekly email digest for agents and travellers.
- Rate limiting on sign-in, reset and the public API.

**Later**
- A second city, by adding a data folder and baseline per destination.
- A white-label embed of the planner for a travel site.
- Learning from outcomes: use accepted and declined proposals to tune the objective weights.
- Offline PDF itinerary with maps.

## 7. Known limits

Delhi only and three days per plan, by design of the optimizer. Booking is a manual record, not a supplier integration. Email and text need provider credentials before anything leaves the server. Equal split only for shared expenses.
