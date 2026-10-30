# Merydian

Merydian plans group trips for several families at once and keeps the plan current as people change their minds. A travel agent adds customers and trips. A constraint solver builds a day-by-day plan that respects each family's pace, budget and interests. Travellers read the plan, send feedback in plain language, and a new version appears for the agent to approve.

It is an academic project. There is no live booking: the supplier (TBO) integration is not connected, so hotel and flight bookings are recorded in a ledger rather than made.

## What it does

**Travellers**
- Sign up, plan a trip, and read a day-by-day timetable with a map and calendar.
- Send feedback such as "we have a small child, keep the days shorter". A language model turns it into constraints, the optimizer replans, and the agent sees the new version.
- Family branches: each family in a group trip can have its own variation of the shared plan.

**Travel agents**
- Customers, preferences and invitations (the customer gets an invite link or email).
- A Desk to accept or decline requested changes, with version history and a feedback log for every trip.
- Insights: business metrics across customers and trips.
- Notes and tasks, group expenses and a checklist, calendar (.ics), print and CSV exports.
- Live notifications over a server-sent stream, outbound webhooks signed with HMAC, and personal API keys.
- Agencies: each agency sees only its own customers and trips.

**Under the hood**
- Optimizer: Google OR-Tools CP-SAT builds itineraries in about a second for a three-day city plan.
- Feedback pipeline: FastAPI, Celery and Redis run the language model and the optimizer in the background.
- Email and SMS go out through SMTP and Twilio when configured. Without them, messages are recorded instead of sent.

## Architecture

```
Vercel (React app) --> Render (FastAPI + Celery worker, one Docker container) --> Neon (Postgres)
                                                                          \-> Redis (Key Value)
```

| Part | Technology |
|---|---|
| Frontend (`frontend V2/`) | React 19, TypeScript, Vite, Tailwind v4, React Router, TanStack Query, Leaflet maps, GSAP |
| API (`backend/app/`) | FastAPI, SQLModel and SQLAlchemy, Alembic, JWT auth |
| Background work | Celery with Redis |
| Optimizer (`ml_or/`) | OR-Tools CP-SAT |
| Language model (`agents/`) | Groq, `openai/gpt-oss-20b` |
| Database | Postgres (Neon in production, Docker locally) |

The look of the app is "The Printed Timetable": ruled tables, hairlines and small radii. See [DESIGN.md](DESIGN.md) and [PRODUCT.md](PRODUCT.md).

## Run it locally

You need Python 3.11, Node 20 or newer, and Docker.

```bash
# 1. Postgres and Redis
docker compose up -d postgres redis

# 2. Settings: copy the template and fill in your own values
cp .env.example .env

# 3. API (from the repo root)
pip install -r backend/requirements/api.txt -r backend/requirements/worker.txt
python backend/scripts/db_bootstrap.py
cd backend && uvicorn app.main:app --reload --port 8000

# 4. Worker (a second terminal, from backend/)
celery -A app.core.celery_app:celery_app worker --loglevel=info --pool=solo

# 5. Frontend (a third terminal)
cd "frontend V2" && npm install && npm run dev
```

Open http://localhost:5173. The API reference is at http://localhost:8000/docs.

Set `SEED_ON_START=true` to load five demo trips and use **Explore the demo**. Set `GROQ_API_KEY` to turn on feedback replanning.

## Settings

Real values never go in the repository. `.env` and `backend/.env` are gitignored. `.env.example` lists every variable with a placeholder.

| Variable | Purpose |
|---|---|
| `SQLALCHEMY_DATABASE_URI` | Postgres connection string |
| `SECRET_KEY` | Signs login tokens |
| `GROQ_API_KEY` | Language model for feedback |
| `AGENT_SIGNUP_CODE` | Passphrase needed to create an agent account |
| `FRONTEND_URL`, `BACKEND_CORS_ORIGINS` | The web app's address, for links and CORS |
| `SMTP_*`, `TWILIO_*` | Optional. Leave empty and messages are recorded, not sent |
| `TBO_USERNAME`, `TBO_PASSWORD` | Only for the old TBO test scripts in `backend/test/` |

## Deploy

[docs/DEPLOY.md](docs/DEPLOY.md) is the step-by-step runbook for Neon, Render and Vercel. `render.yaml` is the Render blueprint and `Dockerfile` builds the API and worker image.

The image has been built and booted in the mode Render uses, and passes a 28-check smoke test:

```bash
python backend/scripts/deploy/smoke_test.py https://<your-api> <AGENT_SIGNUP_CODE>
```

It creates test accounts, so point it at a staging copy.

## Documentation

| File | Contents |
|---|---|
| [docs/DEPLOY.md](docs/DEPLOY.md) | Deployment runbook and troubleshooting |
| [docs/DEMO_WALKTHROUGH.md](docs/DEMO_WALKTHROUGH.md) | A scripted agent-and-customer walkthrough with a talk track |
| [docs/USE_AND_EXTEND.md](docs/USE_AND_EXTEND.md) | How the system can be used and extended |
| [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) | Architecture notes from earlier phases |

## Known limits

- No live supplier. Bookings are a ledger.
- One city per itinerary.
- On Render's free tier the first request after a quiet period can take up to a minute, and plan updates take 10 to 40 seconds because the language model call dominates.
- Files in `trip_sessions` are on a temporary disk. The database is the source of truth.
