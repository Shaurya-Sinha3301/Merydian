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

## 5. Roadmap

**Next (days)**
- Drive the live stream from the existing Redis pub/sub instead of reading the table, so a push is instant and the database is not polled.
- Family-specific feedback: let one family change only their branch, so the Group tab shows real divergence.
- Trip length from the dates (today the baseline is three days).
- Password reset and invite links, so customers do not rely on a temporary password.
- Email delivery of notifications (the webhook path is already there).

**Then (weeks)**
- A second city: add a data folder and a baseline skeleton per destination.
- Per-agency tenancy: agencies see only their own customers and trips.
- Personal API keys for agents, so partners can read trips and post requests without a browser.
- Supplier booking behind the existing ledger once credentials exist; the ledger stays as the record.
- Traveller expense split and shared checklists for group trips.

**Later**
- A white-label embed of the planner for a travel site.
- Learning from outcomes: use accepted versus declined proposals and ratings to tune the objective weights.
- Offline PDF itinerary with maps, built from the same plan data.

## 6. Known limits

Delhi only; plans are three days regardless of dates; the optimizer silently leaves out places that will not fit, and the app says so when asked for one; no email or SMS; booking is a manual record, not a supplier integration; agents share one pool of customers.
