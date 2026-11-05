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
3. You do not create tables by hand. On every start the container runs the migrations (`scripts/db_bootstrap.py`) over a **direct** connection, behind a database lock so two containers starting together cannot migrate at once.
   - The pooled string you set as `SQLALCHEMY_DATABASE_URI` is used by the app. For migrations the direct address is derived from it automatically (the same host without `-pooler`). To set it yourself, add `MIGRATION_DATABASE_URI`.
   - A database created by the older "create any missing tables" start-up is adopted, not rebuilt, if it matches the models. If it does not match, the start stops and lists the differences instead of guessing.
   - Schema changes are now migrations only. `python backend/scripts/deploy/check_migrations.py` proves an empty database, an undo-and-redo, and an old database all end up matching the models.

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
| `APP_MODE` | `showcase` (set by `render.yaml`). Without it the default is `production`, which shuts the demo door. Check it is set in the dashboard |
| `TRUSTED_PROXY_HOPS` | `1` (set by `render.yaml`): Render's proxy adds the visitor's address to `X-Forwarded-For`. See the check below |
| `METRICS_TOKEN` | Optional. In showcase mode `/metrics` and `/ops` are open; set a token to require `Authorization: Bearer <token>` |
| `PLAN_CACHE_TTL_SECONDS` | Optional, default `900`. How long an unread plan stays cached. Every change refreshes it at once, so this is not how stale it can get |

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

## 8. Running the full architecture

Render runs everything in one container (`all` mode: migrations, the API, a worker on every queue, and the
scheduler), which is enough for a showcase. The same code runs as separate services:

```bash
docker compose up --build
```

That starts Postgres, the two Redis roles (`redis` never evicts; `redis-ephemeral` may), a one-shot `migrate`,
two API copies on ports 8000 and 8001 (the API image, which has no solver), `worker-optimizer` and
`worker-default` (the worker image), and the `scheduler`.

Container modes: `api`, `worker-optimizer`, `worker-default`, `worker` (queues from `CELERY_QUEUES`),
`scheduler`, `migrate`, `all`.

## 9. After a deploy of the new backend

1. `/health/ready` should show `schema: current`, at least one worker serving `optimizer`, and `llm_provider: configured`.
2. `/ops` (showcase mode, or with the token) shows queues, workers, jobs, the outbox and error groups.
3. Check the proxy setting once: from one network, send eleven wrong sign-ins quickly; the eleventh should get 429. From
   another network at the same time, sign-in should still be allowed. If both are refused, `TRUSTED_PROXY_HOPS` is wrong
   for Render's proxy chain.
4. Run every check locally before merging: `python backend/scripts/deploy/drills.py --images` (see `DRILL_REPORT.md`).
