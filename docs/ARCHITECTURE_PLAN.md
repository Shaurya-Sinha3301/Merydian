# Work plan (version 2)

The milestone-by-milestone plan for reaching the system described in `TARGET_ARCHITECTURE.md`. The reasoning for each correction is in `DESIGN_REVIEW_AND_FIXES.md`.

No code. **Status: every milestone (M1 to M12) is built and checked; M1 is deployed, M2 to M12 are not yet. The build log at the end records what was built, where it differs from this plan, and the defects found on the way.** Estimates are rough, one person working, and are the least certain part of this document.

---

## 0. Ground rules

- **Every milestone ships on its own and leaves the system working.** No milestone is allowed to leave a half-finished state.
- **Expand, then contract.** Add the new thing, run old and new side by side, move over, and only then remove the old. Old and new code must be able to run together for a few minutes during a deploy.
- **Each milestone ends with a repeatable check.** If it cannot be proven by a script, it is not finished.
- **Every write path is protected in layers.** An ownership check, a row lock, and a database rule that refuses the impossible.
- **Cost is ignored.** Hosting limits do not shape the design. The live site can run a single-container profile of the same images.
- **Webhooks stay** as they are, as an optional channel. They are not extended and not removed.
- **Over-engineering is excluded.** No orchestrator, no extra message system, no separate optimizer web service, no replicas.

## 1. Starting point

What exists today, so the plan starts from facts:

- The API and a single worker run in one container. The API runs the solver **inside a web request** when a trip is created, which freezes its single event loop for 1 to 5 seconds.
- The optimizer keeps its iteration chain in files on the container's disk. Customer reads already come from the database, with the file as a fallback.
- ~~Startup creates missing tables and stamps a migration marker. It cannot alter an existing table.~~ **Resolved by milestone 1.** Migrations are now the only way the schema changes.
- Job claiming exists, with a three-minute lease on the worker's clock, but finishing a job does not check ownership.
- A per-trip Redis lock, a family row lock and a unique rule on version numbers exist (the hardening change). Sign-in lockout exists.
- A job is saved and then published in two separate steps.
- Waiting jobs retry thirty times, eight seconds apart, then give up with a misleading message.
- Notifications, email and webhooks are triggered from service code, not from a durable record of what still needs sending.
- One Redis carries the queue, the cache, live notifications and locks.

---

## 2. Order and dependencies

```
 M1   Migrations baseline
  │
  ├─ M2   Working state from files into the database
  ├─ M3   Idempotency keys
  ├─ M4   Demo mode, client address, limiter          (independent after M1)
  │
 M5   Transactional outbox (job publishing and announcements)
 M5a  Lease with fencing and heartbeat renewal
 M5b  Waiting jobs retry to a deadline, with sequence numbers
  │
 M6   Trip creation as a job, hybrid wait response     (needs M2, M3, M5)
 M7   Redis split into queue and ephemeral
 M8   Two images, two services, one Compose file       (needs M2, M6)
 M9   Two queues, optimizer worker and default worker, heartbeats
 M10  Scheduler
 M11  Metrics, error tracking, readiness that includes the worker
 M12  Failure drills and the delivery pipeline
```

If time runs short, the cut line that keeps most of the value is **M1 to M5a, then M6, M8 and M12**.

Estimated total: about **18 to 22 working days.**

---

## M1. Migrations baseline  (about 1.5 days)  **BUILT, deployed**

**Goal:** every schema change from here on is a controlled, repeatable migration.

**Why first:** every later milestone changes the schema.

**Scope**
- A single baseline migration that describes the schema as it is today. Fresh databases get every table from it. Existing databases, including the live one, are marked as already at the baseline without changing anything, which is safe because they were built from the same models.
- Remove "create missing tables" from startup. Keep it only for automated tests.
- Run migrations once per release, before new code serves traffic, behind a database advisory lock so two starting containers cannot migrate together. Workers do not migrate. They wait until the schema reports the expected version.
- Migrations use the **direct** database connection. The API and workers use the pooled one.
- Move the unique version rule, currently applied by a one-off startup step, into a migration.

**Rules adopted:** expand then contract. Never rename or drop something in the same release that stops using it.

**Safety nets:** a database branch or restore point before any risky migration. An automated check on every pull request: an empty database built from migrations equals the model definitions, and a copy of the previous release's schema upgrades cleanly.

**Verification:** a fresh database from migrations equals the models. An old copy upgrades. A deliberate bad migration is caught by the check, not in production.

**Risks:** the baseline must describe reality exactly, which the comparison check protects. If production holds rows that break a new rule, the migration must report them and stop.

### What was built, and where it differs from the plan
- **Two revisions, not one.** `0001` is the full 32-table baseline. `0002` adds the unique rule on itinerary version numbers. It is separate on purpose, so a database that never had the rule receives it as an ordinary change. If the rule already exists as a constraint, `0002` swaps it for the equivalent index the models declare. If duplicates exist, it stops and says how many.
- **Adopting an old database.** A database stamped with either old revision, or holding tables but no version at all, is compared with the models. If it matches, it is stamped at `0001` and brought up to date without being rebuilt. If it differs, nothing is touched and the differences are listed.
- **Direct connection.** Migrations use `MIGRATION_DATABASE_URI` if set. Otherwise the direct address is derived from a pooled Neon address (the same host without `-pooler`), else the normal address is used.
- **Lock.** A database-wide advisory lock, waited on for up to three minutes, stops two processes migrating together.
- **Stops on drift.** If the schema still differs from the models after migrating, the start-up stops. `MIGRATION_ALLOW_DRIFT=true` overrides it.
- **Services that do not migrate wait.** The API and worker modes of the start script wait until the database is at the expected revision (`wait_for_schema.py`, 300 seconds by default).
- **The pull-request check** is `backend/scripts/deploy/check_migrations.py`, with 7 checks: one head, a fresh build, no drift, undo and redo, adoption of an old database, no drift after adoption, and refusal of a database that really differs. It replaces the planned "upgrade a copy of the previous release's schema" check, which needs a stored snapshot that does not exist yet. The adoption simulation covers the same risk for the first release.

### Two defects found while building it
- `families` and `itineraries` point at each other, so a generated baseline could not create them in either order. The baseline adds one of the two links after both tables exist.
- Undoing the baseline left the database's enum types behind, which made the next upgrade fail. The baseline now drops them.

### Evidence
The migration check passes all 7 checks. The 23 hardening checks pass on a database built only from migrations. Four bootstraps started at the same instant on an empty database produced one build and three waits, all exiting 0. A database holding duplicate version numbers was refused and left at `0001`.

### Not yet verified
The Docker image build, the full smoke test on the new start-up, and a run against the live Neon database. Do these before the first deploy.

---

## M2. Working state from files into the database  (about 2.5 days)  **BUILT**

**Goal:** the optimizer needs no disk, so any worker can run any job.

**Scope**
- An **append-only iteration table**: trip, iteration number, kind (baseline or optimized), the input snapshot that produced it, the result, and the time.
- The optimizer becomes a function of a snapshot. A replan loads the latest iteration from the database, runs the solver, and saves a new iteration and plan version in one transaction. Any scratch folder is private to one job and deleted when it ends.
- Static reference data (points of interest, transport times, baseline skeletons) stays in the worker image, since it is read-only and shared.

**Steps (expand, then contract)**
1. Add the table. No behaviour change.
2. Dual-write: every iteration goes to both the file and the table. Reads prefer the database.
3. Backfill existing trips from their files with a one-off script, and count to confirm nothing is missing.
4. Switch the optimizer's input to the table. Keep dual-write for one release.
5. Stop writing files. Remove the deprecated file-path columns in a later release.

**Storage budget:** plan JSON is tens of kilobytes. Compress stored payloads, keep full snapshots only for the last few iterations per trip, and set a retention rule.

**Verification:** delete a trip's working folder mid-trip and replan, which must still work. Run two replans on two separate worker processes: both read the same latest iteration and the trip lock makes one wait. Restart the worker mid-job and see another finish it from the database alone.

**Risks:** some code paths still read the file fallback, and each must be found before step 5. Lists must fetch only the columns they show, so larger rows do not slow history pages.

---

## M3. Idempotency keys  (about 1.5 days)  **BUILT**

**Goal:** repeating a request does not repeat its effects.

**Scope**
- The browser sends a fresh random key per user action and reuses it on retry.
- A database table remembers each key: who sent it, the endpoint, a fingerprint of the request body, whether it is in progress or finished, and the response to replay. A uniqueness rule on (user, endpoint, key) lets the database decide a race.
- Behaviour: a new key is recorded and the work done. The same key after completion returns the saved response, and for job-creating requests that is **the same job**. The same key while in progress says the work is already under way and points at the job. The same key with a different body is refused. A failed attempt releases the key so the client can retry.
- Keys expire after a day, cleaned by the scheduler.
- A second net for clients with no key: the same user, trip and message within thirty seconds is a duplicate.
- Correctness lives in the database. Redis may speed up the check, but an outage must not let duplicates through.
- Applies, in order of cost, to: feedback, trip creation, plan approval, adding a customer, recording a booking, creating a key or webhook. Reads are exempt.
- The browser also disables the button while a request is pending.

**Verification:** ten identical concurrent requests produce one job and one version. A retry after a failed attempt works. The same key with a different body is refused. A key is forgotten after the retention period.

---

## M4. Demo mode, client address and limiter  (about 1 day)  **BUILT**

**Goal:** a showcase flag cannot accidentally leave production open, and rate limits cannot be dodged.

**Scope**
- One environment setting selects showcase or production. In production the demo endpoints are switched off whatever other settings say. In showcase mode the demo agent's session is short and labelled, and demo reset stays behind the admin key.
- **Real client address:** trust only the hosting provider's proxy by counting a configured number of hops from the right-hand end of the forwarded list. Forged forwarded addresses no longer reset a counter.
- **Fail mode by route type:** sign-in, sign-up, forgot-password and reset use a fallback limiter held in the process's own memory if Redis is down, so they are never wide open. Ordinary routes keep failing open.
- **Limits per route:** tight on sign-in, sign-up and forgot-password. Loose on reads. Tighter on anything that starts a job or calls the language model.
- Per-account limits on those routes in addition to the existing sign-in lockout.

**Verification:** forged forwarded addresses do not reset the counter. Redis down still limits sign-in. Production mode returns "not found" for demo endpoints even if the demo flag is on.

---

## M5. Transactional outbox  (about 2 days)  **BUILT**

**Goal:** nothing accepted is lost to a crash between the database and the queue, and no announcement is lost between saving a plan and telling anyone.

**Scope**
- An **outbox table**: a row per thing to do (publish a job, send a notification, send an email or SMS, deliver a webhook) with its state, attempts, next-try time and a stable event ID.
- **Job creation:** the API writes the job row and an outbox row "publish this job" in one transaction and returns the job ID. A fast path publishes right after the commit, and the dispatcher publishes anything that did not finish. A database wake-up signal plus a short polling loop keep the delay near zero.
- **Announcements:** the transaction that saves a plan also writes its notification, email and webhook rows. The default worker's dispatcher delivers them, with growing waits between retries, and parks a row that keeps failing for a person to look at.
- Several dispatchers are safe: each takes only rows no other dispatcher has locked.
- **Duplicates are expected and harmless.** Claiming a job is a conditional update, and notifications and webhooks carry stable event IDs.
- **Webhooks:** delivery moves from inline to the outbox. Their behaviour is unchanged.

**Verification:** stop the API right after a commit and the job still runs. Stop Redis, submit, restart Redis, and the job runs. Stop the worker after the plan is saved and the notification still arrives once from the user's view.

**Risks:** the outbox grows if never cleaned, so the scheduler (M10) removes finished rows after a retention period.

---

## M5a. Lease with fencing and heartbeat renewal  (about 1.5 days)  **BUILT**

**Goal:** a paused or late worker can never overwrite a result.

**Problem being fixed:** finishing a job does not check ownership, the timestamp does double duty, and workers' clocks are compared.

**Scope**
- Explicit ownership fields on the job: the owner, a **fencing number** that rises by one each time ownership changes hands, the lease expiry and the last heartbeat.
- **All times come from the database's clock.**
- Claiming is one conditional update (queued, or running with an expired lease) that raises the fencing number and returns it.
- **Heartbeat:** the owner renews every thirty seconds with "only if the fencing number is still mine". If no row changes, ownership was lost and the worker stops at once and discards its work. The lease becomes about ninety seconds, and jobs may run longer than it.
- Completing, failing and retrying all carry the fencing number.
- **The result and the completion are one transaction** that locks the job row and checks the number first, so a takeover cannot slip in halfway.
- The Redis trip lock is **demoted to an optimisation**. Safety comes from the number, the row lock and the unique version rule.
- Work done before the commit, such as a language-model call, may happen twice if ownership moved. Its result is discarded.

**Verification:** pause an owner past its lease with an injected stall, let a second worker finish, then wake the first. Its write is refused, leaving one plan version, one completion and no duplicate notification. Stopping the heartbeat makes the owner abandon its work within seconds.

**Depends on:** M1, since it changes the job table.

---

## M5b. Waiting jobs retry to a deadline  (about 0.5 to 1 day)  **BUILT**

**Goal:** a job turned away by a trip lock is never abandoned early or failed with a misleading message.

**Scope**
- A waiting job retries until **its own deadline**, not a fixed count. If it runs out, it fails with "this trip was busy" in plain words.
- Where order matters, such as several feedback messages from one customer, jobs carry a **sequence number** and a job waits until its predecessor has finished.
- Each job already starts from the latest saved plan, so no work is lost either way.

**Verification:** keep a trip busy longer than the old four-minute limit and see the waiting job still run, or fail clearly.

---

## M6. Trip creation as a job  (about 2 days)  **BUILT**

**Goal:** the API never blocks on a solve.

**Scope**
- The trip-creation endpoint creates a job (through the outbox) and waits, **without blocking**, up to about eight seconds for the result. If it finishes, the endpoint answers exactly as it does today. If not, it answers "accepted" with the job to watch, and the browser polls the same job-status endpoint that feedback uses.
- The same rules (ownership, retries, expiry, per-trip lock) now cover trip creation.
- Frontend: handle the "accepted" case with the existing polling.

**Depends on:** M2 (no disk), M3 (idempotency), M5 (outbox).

**Verification:** measure the response time of a trivial page while a plan is being built. Today it stalls for the length of the solve. After this it must not.

---

## M7. Redis split into queue and ephemeral  (about 1 day)  **BUILT**

**Goal:** memory pressure from the cache can never evict queued messages or lockout counters.

**Scope**
- **queue:** Celery broker, per-trip locks, sign-in lockout counters, worker heartbeats. Persistence with a once-per-second sync. Never evicts.
- **ephemeral:** itinerary cache, low-value rate-limit buckets, pub/sub for live notifications. No persistence. Evicts when full.
- Separate connection settings per role, falling back to the single existing setting so a one-instance environment still works.
- Switch the Celery result backend off.
- Every key carries an expiry.
- Honest wording everywhere: Redis persistence lowers the chance of loss and does not remove it. The database is the record.

**Verification:** fill and flush the ephemeral instance and see only speed affected. Flush the queue instance with jobs waiting and see the scheduler (M10) re-publish them.

---

## M8. Two images, two services, one Compose file  (about 1.5 days)  **BUILT**

**Goal:** the API and the workers are separate deployables, and one command runs the whole architecture.

**Scope**
- One build file, two targets. The **API image** has only what the API needs. The **worker image** adds the solver, the language-model clients, the agents and the reference data.
- Least privilege: the model key exists only in the optimizer worker. The API holds the database, Redis and signing secrets. The default worker holds the email and SMS credentials.
- The container's start script already has API, worker, beat and all-in-one modes, so this is mostly packaging.
- One Compose file runs: two API copies, an optimizer worker, a default worker, the scheduler, Postgres with the pooler, both Redis instances, and the observability stack.
- Keep the all-in-one profile for the live site, selected by a setting.

**Depends on:** M2 and M6.

**Verification:** the API image contains none of the solver or model packages. The Compose stack passes the smoke test.

---

## M9. Two queues and worker heartbeats  (about 1 day)  **BUILT**

**Goal:** a burst of replans can never delay a notification, and the system can tell whether plans will be built.

**Scope**
- An `optimizer` queue for solver and language-model jobs, and a `default` queue for the rest.
- Optimizer concurrency is tied to cores, one job per core by default, one message at a time per worker.
- Graceful shutdown: a stopping worker finishes or hands back its job.
- Every worker writes a heartbeat with its name, queue and age to the queue Redis. Readiness reports it.

**Verification:** flood the optimizer queue and confirm notifications still go out at once. Stop all workers and confirm readiness says so.

---

## M10. Scheduler  (about 1 day)  **BUILT**

**Goal:** repairs happen without anyone looking.

**Scope:** one copy, behind a lock on the queue Redis, running these safe-to-repeat sweeps:
- re-publish jobs CREATED or QUEUED for over a minute with no sign of a worker, failing them with a clear reason only after a few tries and an overall deadline,
- fail RUNNING jobs whose lease expired and whose attempts are used up,
- retry outbox rows stuck in progress,
- expire idempotency keys and old finished outbox rows,
- remove expired reset and invite tokens, old delivery logs and demo clutter.

**Verification:** make a job look abandoned and see it handled within a minute with nobody looking. Start two schedulers and confirm only one acts. Flush the queue Redis and see jobs re-published.

---

## M11. Metrics, error tracking and readiness  (about 1.5 days)  **BUILT**

**Goal:** failures are visible without a user complaining.

**Scope**
- Structured logs with a request ID that follows a request through the queue into the worker, extending the existing correlation IDs.
- Metrics from every service: queue length, job duration, jobs failed or expired, lease takeovers, lock waits, outbox backlog, database pool use, replan latency. One small dashboard.
- Error tracking that groups exceptions and shows the request behind them.
- Readiness checks the database, the schema version, the queue Redis and a recent worker heartbeat.

**Verification:** stop each dependency in turn and see the dashboard and readiness page show it.

---

## M12. Failure drills and delivery pipeline  (about 2 days)  **BUILT**

**Goal:** every claim is proven by a script, and every change is tested before it ships.

**Scope**
- A drill script, one drill per row of the table in `TARGET_ARCHITECTURE.md` section 7.4, with saved output.
- A pipeline on every pull request: lint and type checks, unit tests, the hardening checks and the drills that can run in CI against real Postgres and Redis, the migration check, a build of every image, and the smoke test against the Compose stack. Merging deploys.
- A dependency scan and automatic update proposals.
- A session revocation mechanism, so a stolen token can be cut off.

**Verification:** a deliberately broken change is rejected by the pipeline.

---

## 3. Risks across the plan

| Risk | How it is contained |
|---|---|
| Moving the optimizer's state is the riskiest change | Dual-write for a release, backfill and count, and a tested "delete the folder and replan" check |
| Changing trip creation changes what the browser receives | The hybrid response keeps today's behaviour for fast cases, and polling already exists for feedback |
| The migration baseline must describe reality | An automated comparison against the models on every pull request |
| The outbox and fencing add moving parts | Every one has a drill that breaks it on purpose and checks recovery |
| Duplicate delivery is now expected | Every receiver is idempotent, with stable event IDs |
| Estimates are rough | The cut line (M1 to M5a, M6, M8, M12) delivers most of the value if time runs out |

## 4. How we will know it worked

| Measure | Today | Target |
|---|---|---|
| A trivial API page while a plan builds | Stalls for the length of the solve | Unchanged from idle |
| A job lost to a crash between database and queue | Possible | Never, and a drill proves it |
| A late worker overwriting a result | Possible | Refused, and a drill proves it |
| A cache flush causing lost work | Same Redis as the queue | Only speed is affected |
| A double-click | Two jobs | One |
| A schema change shipped without a manual step | Not possible | Routine (built in milestone 1, to be confirmed on the live database) |
| Time to notice no worker is running | When a user complains | Readiness shows it |

---

## Build log (M2 to M12)

Every milestone ends with a script under `backend/scripts/deploy/` that proves it, and
`backend/scripts/deploy/drills.py` runs all of them and writes `docs/DRILL_REPORT.md`.

| Milestone | Proof script | Where it differs from the plan |
|---|---|---|
| M2 | `stateless_check.py` | The live replan path already read the database and solved in a temporary folder. The remaining disk use was first-plan creation, folder creation, the demo seed and two read endpoints. A per-trip `trip_iterations` table now records every optimizer run (inputs and result). |
| M3 | `idempotency_check.py` | Implemented as middleware for any write under `/api/v1` carrying an `Idempotency-Key`, scoped to a hash of the caller's credential. |
| M4 | `limits_check.py` | `APP_MODE` defaults to production. Render runs in showcase mode. |
| M5 | `outbox_check.py` | Also used for every announcement, so `notify_*` calls are now durable everywhere, not only on the plan path. |
| M5a, M5b | `fencing_check.py` | Lease 90 s, heartbeat every 30 s. The waiting job touches its row so the scheduler does not take it for lost. |
| M6 | `nonblocking_check.py` | Both trip endpoints (agent and traveller) became `TRIP_INIT` jobs. `Prefer: respond-async` asks for the 202 at once. |
| M7 | `redis_split_check.py` | The single Render instance is set to never evict, since it plays both roles. |
| M8, M9 | `queues_check.py` via `image_stack.py` | The traveller's "add this place" also ran the solver inside a request; it became a `POI_PROPOSAL` job so the API image could be solver-free. The language-model key moved to the optimizer worker, and readiness learns whether it is configured from the heartbeat. |
| M10 | `scheduler_check.py` | Added a sweep the plan did not have: a running job whose lease expired, with attempts left, is sent again for a takeover. |
| M11 | `observability_check.py` | Error tracking is built in (grouped by type and code location in `error_groups`) rather than an external service. |
| M12 | `resilience_check.py`, `drills.py`, `.github/workflows/ci.yml`, `.github/dependabot.yml` | Session revocation: "sign out everywhere" now also refuses access tokens issued before it. |

### Defects found while building (each fixed, each now covered by a check)

- **The rate limiter's 429 surfaced as a 500.** It was raised from a middleware, where FastAPI's handlers never see it (M4).
- **An older replan path called a method that did not exist** (`ItineraryService.create_version`) (M2).
- **A lower-case `LOG_LEVEL` broke the agents' logging setup** in a process that had not configured logging first (M2).
- **The outbox fast path silently failed every time**, a detached database row, so everything waited for the dispatcher (M5).
- **Adopting an old database compared it with today's models**, so any table added after the baseline would have refused adoption. Adoption now stamps, migrates and compares inside one transaction (M2).
- **The live Redis evicted keys under pressure**, which could have dropped queued jobs (M7).
- **A database restart permanently failed the job that was running.** A lost connection is now treated as an outage: the job is handed back and retried, and the scheduler re-sends it if even that fails (M12).
- **The smoke test only worked with one particular agent code** (found before M2).

### Not verified

- The GitHub Actions workflow has been checked for syntax only; it has not run on GitHub yet.
- `pip-audit` may report known issues in the pinned dependencies on its first run.
- None of M2 to M12 has run on the live Render and Neon services.
