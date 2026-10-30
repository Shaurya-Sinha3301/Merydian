# Deploying Merydian

Three free services, wired together:

```
Vercel (React app)  ->  Render (API + Celery worker in one Docker container)  ->  Neon (Postgres)
                                         \-> Render Key Value (Redis)
```

The Docker image was built and booted from this repo, in the same mode Render uses, and passed `backend/scripts/deploy/smoke_test.py` (28 checks) before this note was written. Nothing below needs paid plans.

Dependencies are pinned in `backend/requirements/*.txt`. The first build with unpinned packages failed twice (a newer SQLModel rejected the code's timezone-less datetimes, and newer SQLAlchemy defaulted to a database driver the image does not install), so update the pins deliberately, not by accident.

## 1. Neon (database)

1. Create a project and a database. Copy the **pooled** connection string.
2. Make sure it ends with `?sslmode=require`. This is your `SQLALCHEMY_DATABASE_URI`.
3. You do not create tables by hand. The container creates and updates them on every start (`scripts/db_bootstrap.py`).

## 2. Render (backend)

1. New, **Blueprint**, pick this repo. Render reads `render.yaml` and creates the web service `meridian-api` and the Key Value `meridian-redis`.
2. Fill in the secrets it asks for:

| Variable | Value |
|---|---|
| `SQLALCHEMY_DATABASE_URI` | The Neon string from step 1 |
| `GROQ_API_KEY` | A **new** key (rotate the one that was shared in chat) |
| `AGENT_SIGNUP_CODE` | A long phrase of your own. Whoever has it can create agent accounts |
| `FRONTEND_URL` | The Vercel address, for example `https://merydian.vercel.app` (fill in after step 3) |
| `BACKEND_CORS_ORIGINS` | `["https://merydian.vercel.app"]`. Any `*.vercel.app` address is also allowed by default |
| `SMTP_*`, `TWILIO_*` | Optional. Leave empty and messages are recorded, not sent |

   `SECRET_KEY` and `DEMO_ADMIN_KEY` are generated for you. Leave `DEV_OUTBOX` and `WEBHOOK_ALLOW_PRIVATE` unset (off).
3. Deploy. The first start builds the image (about 5 minutes), creates the tables and seeds the five demo trips (`SEED_ON_START=true`, safe to repeat).
4. Check it: `https://<service>.onrender.com/health/ready` should report `database`, `redis` and `celery` as connected. `/docs` shows the API reference.

## 3. Vercel (frontend)

1. Import the repo. Set **Root Directory** to `frontend V2`. The framework is detected as Vite; `vercel.json` handles page refreshes.
2. Environment variables:
   - `VITE_API_URL` = `https://<service>.onrender.com/api/v1`
   - `VITE_API_ORIGIN` = `https://<service>.onrender.com`
3. Deploy, then put the Vercel address into Render's `FRONTEND_URL` and `BACKEND_CORS_ORIGINS` and redeploy the API once.

## 4. Check it works (5 minutes)

1. Open the Vercel address. Click **Explore the demo**, enter as the travel agent. You should see five trips on the Desk and Overview.
2. Sign up as a **traveller**, plan a trip, send feedback. The new version should appear within about 40 seconds.
3. Sign up as an **agent** with your `AGENT_SIGNUP_CODE` and a new agency name. Add a customer. Because email is not set up yet, copy the invitation link shown under the form and open it.
4. The bell shows live notices. The green dot beside it means the live stream is connected.

Once it is up you can run the same checks against it, on a staging copy:

```bash
python backend/scripts/deploy/smoke_test.py https://<service>.onrender.com <AGENT_SIGNUP_CODE>
```

It creates test accounts, so do not point it at a deployment people are using.

## 5. Before you share the link

- **Rotate the Groq key** that was pasted into a chat and use the new one on Render.
- **`backend/Api_credentials.pdf` is committed in this repo's history** (it came from an earlier branch). If it holds real supplier credentials, treat them as exposed: rotate them, or make the repository private. Removing the file now does not remove it from history.
- Keep `AGENT_SIGNUP_CODE` and `DEMO_ADMIN_KEY` out of screenshots and the repo.
- The demo agent is shared and open by design. Anything an agent does in the demo changes it for everyone until reset: `POST /api/v1/demo/reset` with the header `X-Admin-Key: <DEMO_ADMIN_KEY>`.

## 6. Things that behave differently on free hosting

| What you will see | Why |
|---|---|
| First page load takes up to a minute | Render sleeps free services after 15 minutes idle. Open it a few minutes before presenting |
| Reset and invite links do not arrive by email | No SMTP provider is set. Add the `SMTP_*` variables, or copy the link shown to the agent |
| Plans take 10 to 40 seconds to update | One worker, and the language model call dominates |
| Files in `trip_sessions` vanish on redeploy | The disk is temporary. The database is the source of truth, and seeding recreates what the demo needs |
| Database wakes slowly after a quiet spell | Neon suspends idle projects. The first request is slower |

## 7. If something is wrong

| Symptom | Check |
|---|---|
| App loads but every request fails | `VITE_API_URL` on Vercel, and that the API address answers `/health/live` |
| Sign-in works then calls are blocked by the browser | `BACKEND_CORS_ORIGINS` / `FRONTEND_URL` on Render |
| `/health/ready` says `database: error` | The Neon string, and that it ends with `?sslmode=require` |
| `/health/ready` says `redis: error` | The Key Value instance exists and the `REDIS_URL` link in `render.yaml` was created |
| Feedback never finishes | The `GROQ_API_KEY`. `/health/ready` shows `llm_provider` |
| Agent sign-up says the code is not valid | `AGENT_SIGNUP_CODE` is empty on Render, or differs from what you typed |
