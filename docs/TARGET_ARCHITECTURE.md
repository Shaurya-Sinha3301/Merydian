# Target architecture (version 2)

The system design we are building toward. It is made on engineering merit alone, with no hosting-cost compromises, and with over-engineering excluded. It includes every correction from the design review (`DESIGN_REVIEW_AND_FIXES.md`). The milestone-by-milestone work plan is in `ARCHITECTURE_PLAN.md`.

No code. **Built so far: milestone 1 only** (controlled migrations, see `ARCHITECTURE_PLAN.md`). Everything else here is design.

---

## 0. The premise

This project will see almost no traffic. It lives on a resume, not on a public product page. **Load is therefore not the reason for any decision here**, and nothing below may be described as "scales to N users".

The design exists for four things:

- **Correctness under failure.** Servers die, requests repeat, two things happen at once. Data must stay right anyway.
- **Separation you can defend.** Every boundary has a reason that fits in one sentence.
- **Demonstrable.** A reviewer can start the whole system with one command, break parts of it on purpose, and watch it recover.
- **Honest.** Every claim on the resume is something a script can prove.

The test for over-engineering: **if a piece cannot be demonstrated, tested or explained in a sentence, it is left out.**

---

## 1. What changed from version 1

| Area | Version 1 | Version 2 |
|---|---|---|
| Job creation and publishing | Two separate steps, so a crash between them lost the job | One transaction writes the job and an outbox row. A dispatcher publishes it. A scheduler re-publishes lost jobs |
| Job ownership | A timestamp on the worker's clock. Finishing a job did not check ownership | Fencing number, heartbeat renewal, database-clock times. Late writes are refused |
| Redis durability | Called "durable" | Called best-effort persistent. The database is the record, so a lost message costs time, not a job |
| Redis instances | Three | Two: **queue** and **ephemeral**. One is acceptable for the demo |
| Per-trip Redis lock | Counted as a safety mechanism | An optimisation only. Safety comes from the fencing number, a row lock and a database rule |
| Waiting jobs | Gave up after thirty tries with a misleading message | Retry until the job's own deadline, with sequence numbers where order matters |
| Webhooks | Delivered inline | **Kept** as an optional outbound channel, delivered from the outbox by the default worker. They are not required, because SSE covers the browsers |

---

## 2. The picture

```
                                    ┌───────────────────┐
   Browser ───────────────────────▶ │  Edge / TLS       │
        ▲   live updates (SSE)      └─────────┬─────────┘
        │                                     │
        │                          ┌──────────▼──────────┐
        └──────────────────────────│  API service        │  stateless, async, light
                                   │  (FastAPI, N copies)│  no solver, no model client
                                   └───┬────────┬────────┘
                                       │        │
                         job + outbox  │        │ reads
                         one transaction        │
                                       ▼        ▼
                              ┌────────────────────────────┐
                              │ Postgres (primary)         │  THE RECORD of everything
                              │  jobs, outbox, plans,      │
                              │  iterations, notifications │
                              │  via a pooler; direct      │
                              │  connection for migrations │
                              └───▲──────────▲─────────▲───┘
                                  │          │         │
        ┌─────────────────────────┴───┐  ┌───┴───────────────┐  ┌──────┴─────────────┐
        │ Dispatcher (in default      │  │ Optimizer worker  │  │ Scheduler          │
        │ worker): outbox → Redis     │  │ solver + language │  │ (one copy)         │
        └──────────────┬──────────────┘  │ model, N copies   │  │ repair and sweep   │
                       │                 └───────▲───────────┘  └────────────────────┘
                       ▼                         │ consume "optimizer" queue
        ┌──────────────────────────────┐         │
        │ Redis "queue"                │─────────┘
        │  best-effort persistence,    │─────────▶ Default worker: consume "default" queue
        │  never evicts                │           email, SMS, webhooks, notifications
        │  • Celery broker             │
        │  • per-trip locks            │
        │  • sign-in lockout counters  │
        │  • worker heartbeats         │
        └──────────────────────────────┘

        ┌────────────────────────────────────────────────────┐
        │ Redis "ephemeral"  (evicts, no persistence)         │
        │  • itinerary read cache   • low-value rate limits   │
        │  • pub/sub: live-notification fan-out to API copies │
        └────────────────────────────────────────────────────┘

   Metrics, structured logs and error tracking: every service reports to one place
```

Parts: **API, optimizer worker, default worker, scheduler, Postgres, two Redis instances, observability.** No orchestrator, no message bus beyond Redis, no gateway.

---

## 3. The services

### 3.1 API service
- **Does:** authenticate, validate, read and write the database, create jobs, stream live notifications.
- **Never does:** solving, language-model calls, sending email, or anything slow.
- **Why separate:** it stays responsive whatever the workers are doing, and restarts without touching a running job.
- **Image:** the smallest possible. The solver, the model clients, the agents and the reference data are not installed in it at all.
- **Several copies are safe.** Live notifications reach a browser whichever copy it is connected to, through the ephemeral Redis (section 3.7).
- **Creating a job:** one transaction writes the job row and an outbox row, then returns the job ID. It never waits on Redis for correctness.

### 3.2 Optimizer worker
- **Does:** consume the `optimizer` queue: create trips, replan after feedback, call the language model, run the solver.
- **Why separate:** it is the only CPU-heavy, memory-heavy, slow component, with its own dependencies. A burst of replans must not delay a notification.
- **How it runs a job:** see the job lifecycle in section 4.
- **Concurrency:** simultaneous jobs multiplied by the solver's own thread count must not exceed the cores available. One job at a time per core is the safe default. Each worker takes one message at a time.
- **Holds** the language-model key, the solver and the reference data. Nothing else does.
- **Keeps nothing between jobs.** If it dies, another copy continues from the database alone.
- **The optimizer stays a library inside this worker**, behind a versioned input/output contract: a trip snapshot in, a plan and a quality report out, with no database access and no files kept. A separate optimizer web service is still over-engineering: it adds a network hop and a deployable for a one-to-five-second function with one caller. If it is ever needed, the cheap extraction is its own queue and image on the same broker, with the contract already in place.

### 3.3 Default worker
- **Does:** consume the `default` queue and run the **dispatcher**:
  - publish job messages from the outbox to the queue,
  - write in-app notifications and announce them on the ephemeral channel,
  - send email and SMS (or record them when no provider is set up),
  - deliver webhooks (section 3.8),
  - run the supplier booking and event tasks that exist today.
- **Why separate from the optimizer worker:** these jobs are tiny, frequent and I/O-bound. They must never queue behind a ten-second solve.
- **Holds no model key and no solver.** If this worker were compromised, the model key would not be on it.
- **Every receiver tolerates repeats.** Delivery is at-least-once, so announcements carry stable event IDs.

### 3.4 Scheduler
- **Does, on a timer, one copy only:**

| Task | How often | What it repairs |
|---|---|---|
| Re-publish lost jobs | Every minute | A job that is CREATED or QUEUED with no sign of a worker for over a minute. After a few tries and an overall deadline, it is failed with a clear reason |
| Fail abandoned jobs | Every minute | A RUNNING job whose lease expired and whose attempts are used up |
| Retry stuck outbox rows | Every minute | A row marked in progress by a dispatcher that vanished |
| Expire idempotency keys | Hourly | Keys older than a day |
| Remove old data | Daily | Expired reset and invite tokens, old delivery logs, demo clutter |
| Worker liveness summary | Every 30 seconds | Feeds the readiness page |

- **Only one copy acts.** It takes a lock on the queue Redis before each sweep.
- **Every sweep is safe to repeat,** because it uses the same conditional updates as job claiming.
- **If the scheduler is down,** nothing breaks. Jobs and notifications still flow. Stuck jobs wait to be cleaned up, and checking a job's status still ends a dead job.
- **Never does real work:** no solving, no sending. It only notices and repairs.

### 3.5 Postgres
- **One primary.** No replicas or sharding: nothing here needs or could demonstrate them.
- **A connection pooler** in front for the API and workers, and **a direct connection** for migrations and advisory locks, because session-level locks do not survive transaction-mode pooling.
- **Separate roles:** the API and workers can read and write rows but cannot alter or drop tables. A separate migration role can.
- **Safety settings:** a statement timeout, an idle-in-transaction timeout so a crashed client cannot hold locks, and an application name per service.
- **Backups:** point-in-time recovery on, and one restore drill written down and actually run.
- **It is the record.** Jobs, outbox rows, plans, iterations, notifications and idempotency keys all live here. Redis holds nothing that cannot be rebuilt.

### 3.6 Two Redis instances

Split by **what happens when a key disappears.** Pub/sub is not a third category: it stores nothing, a message lives only for the instant it is delivered, and clearing a cache does not remove subscriptions. So it shares the evicting instance at no cost beyond a shared failure domain.

| Instance | Holds | If a key vanishes | Settings |
|---|---|---|---|
| **queue** | Celery broker, per-trip locks, sign-in lockout counters, worker heartbeats | A message is lost, a lock is released early, a lockout resets | Persistence with a once-per-second sync. **Never evicts** |
| **ephemeral** | Itinerary read cache, low-value rate-limit buckets, pub/sub for live notifications | A page is slower, or a browser misses one live nudge and fetches it on reconnect | No persistence. Evicts when full |

**What persistence does and does not promise.** It lowers the chance of loss and does not remove it. Syncing once a second can lose about the last second of writes in a crash, syncing on every write is slower, and a lagging replica can still lose data when it takes over. So **correctness never depends on Redis keeping a message.** The job row and outbox row are in the database, and the scheduler re-publishes anything with no sign of a worker. A lost message costs about a minute, not a job. The once-per-second setting is therefore enough.

**Why the queue instance stays apart from the cache.** Memory pressure from the cache must not evict queued messages or sign-in counters. If lockout counters sat on an evicting instance, an attacker could flood it to reset their own lockout.

**When one instance is enough.** At this traffic, one instance set to never evict, with an expiry on every key, works. Local development and the single-container showcase use one. Two is the design target, not a requirement of the demo.

**Other details.** The Celery result backend is off, since job state lives in Postgres. Each role has its own connection setting, falling back to a single setting.

### 3.7 Live updates
- A notification is written to the database first, then announced on the ephemeral channel. Every API copy listens and forwards to its connected browsers over SSE.
- **Live delivery is best-effort. Delivery on reload is guaranteed.** A browser that missed a message fetches it from the database on reconnect, using the last notification number it saw. The existing stream already resumes from a number.
- If an agent is offline, email covers them.

### 3.8 Webhooks (kept, optional)
- **Decision:** the existing webhook feature stays. It is not required, because SSE serves the browsers, and it receives no new features. Its only change is how delivery is triggered.
- **Role:** an optional outbound channel for an agency that wants events pushed to its own system. Nothing in the core flow depends on it.
- **How it fits the design:** a webhook delivery is one more outbox row, handled by the default worker. It keeps today's behaviour: signed requests, a timestamp, retries, and a delivery log.
- **Protection retained:** the private-address guard stays. **To verify in the code before relying on it:** the address is checked again at send time, not only when the endpoint was registered, and redirects are not followed. Without those, an endpoint could be changed to point at an internal address after registration.
- **Claims:** mention webhooks on a resume only if the smoke test and a drill for the guard are passing.

---

## 4. The life of a job

States: **CREATED** (job and outbox row saved, not yet published), **QUEUED** (published), **RUNNING** (owned under a fencing number), then **COMPLETED**, **FAILED** or **CANCELLED**.

1. **Create.** The API writes the job and an outbox row "publish this job" in one transaction and returns the job ID. If the client retried, its idempotency key returns the same job.
2. **Publish.** The API tries to publish right after the commit as a fast path. If it did not finish, the dispatcher publishes the row. The job becomes QUEUED. A duplicate publish is harmless.
3. **Wait for the trip.** A worker takes the message and tries the **per-trip lock**. If another replan of that trip holds it, the message goes back with a short delay, and the worker is free for other trips. A waiting job retries until its own deadline, not a fixed count. Where order matters, jobs carry a sequence number and wait for the predecessor.
4. **Claim.** One conditional update takes the job if it is queued, or running with an expired lease. It raises the **fencing number** and returns it. Only one worker wins.
5. **Work.** The worker loads the trip snapshot from the database, calls the language model with a timeout, and runs the solver. Every thirty seconds it renews its lease, saying "only if the fencing number is still mine". If that changes no row, ownership is lost and it stops and discards its work.
6. **Commit.** In one transaction it locks the job row, checks the fencing number, saves the plan version, the iteration and the "current plan" pointer, writes the outbox rows (notification, email, any webhook) and marks the job completed. If the number does not match, the transaction is abandoned.
7. **Announce.** The dispatcher delivers the outbox rows: notification, SSE push, email, webhook. Retries use growing waits, and a row that keeps failing is parked for a person to look at.
8. **Repair.** The scheduler fixes anything that stalls: it re-publishes a lost job, fails a job whose owner is gone and whose attempts are used up, and retries stuck outbox rows.

---

## 5. The guarantees, and what provides each

| Guarantee | Provided by |
|---|---|
| An accepted job will run, even if the API, Redis or a worker fails | Job and outbox in one transaction, the dispatcher, the scheduler's re-publish, the lease |
| A job's result is written at most once | Fencing number checked in the same transaction as the result |
| Two replans of one trip never overwrite each other | Fencing number, family row lock, a database rule against duplicate version numbers. The Redis lock only saves effort |
| A repeated request does not repeat its effects | Idempotency keys in the database |
| A lost Redis message costs time, not data | The database is the record, and the scheduler re-publishes |
| A cache flush costs speed, not correctness | Nothing in the ephemeral Redis is the only copy of anything |
| An announcement survives a crash after the plan is saved | The outbox |
| Guessing passwords on one account is bounded | Account-based lockout, with its counters on the queue Redis |

**The honest wording** for delivery is: *at-least-once delivery from the database, with idempotent consumers.* It is not "zero message loss".

---

## 6. Data and consistency decisions

- **Postgres is the only source of truth.** Redis holds nothing that cannot be rebuilt or does not heal by itself.
- **Working state lives in the database,** in an append-only iteration table, so workers keep no state between jobs and any worker can take over any job.
- **The optimizer's inputs and outputs are stored as versioned snapshots,** which also makes every plan reproducible.
- **Every write path is protected in layers:** an ownership check, a row lock, and a database rule that refuses the impossible. No single layer has to be perfect.
- **Idempotency keys** guard every request that costs money or creates a record.
- **Schema changes only through migrations,** with expand and contract.
- **Time comes from the database.** No two machines' clocks are ever compared.

---

## 7. Operations

### 7.1 One command brings up the whole system
A single Compose file runs every service above: two API copies, an optimizer worker, a default worker, the scheduler, Postgres with the pooler, the two Redis instances, and the observability stack. This is the main way the design is shown, since the live site is not expected to run this many services. The live site can run a single-container profile of the same images, chosen by a setting, so there is one codebase and two deployment shapes.

### 7.2 Health and readiness
- **Liveness:** the process is running.
- **Readiness of the API:** the database answers, the schema is at the expected version, the queue Redis answers, and a worker has written a heartbeat in the last minute. "The site is up" then means "plans will be built".
- **Every worker writes a heartbeat** with its name, queue and age. The readiness page lists who is alive.

### 7.3 Observability
- Structured logs with a request ID that follows a request from the API into the queue and into the worker. The code already has correlation IDs.
- Metrics from every service: queue length, job duration, jobs failed or expired, lease takeovers, lock waits, outbox backlog, database pool use, replan latency. A small dashboard shows them.
- Error tracking that groups exceptions and shows the request behind them.
- Full distributed tracing is over-engineering here.

### 7.4 Failure drills
A script breaks things on purpose and checks recovery. Each is a repeatable proof.

| Drill | What it proves |
|---|---|
| Stop the API right after a job is committed | The outbox delivers the job anyway |
| Stop Redis, submit a job, restart Redis | The job is accepted and then run |
| Flush the queue Redis with jobs waiting | The scheduler re-publishes them. Nothing is lost |
| Pause an owner past its lease, let another worker finish, wake the first | The late write is refused: one plan, one completion |
| Stop the heartbeat | The owner abandons its work within seconds |
| Kill the optimizer worker mid-job | Another worker takes over and finishes, or the job fails cleanly |
| Fill and flush the ephemeral Redis | Only speed is affected |
| Restart Postgres | Connections recover and no job is lost |
| Stop the worker after the plan is saved, before the notification | The outbox still delivers it |
| Kill the API copy that holds a live stream | The browser reconnects and resumes from its last number |
| Send the same request ten times at once | One job, one plan version |
| Keep a trip busy longer than the old retry limit | The waiting job still runs, or fails with a clear reason |
| Register a webhook pointing at an internal address, then change it afterwards | The delivery is refused |

### 7.5 Delivery pipeline
On every pull request, automatically: lint and type checks, unit tests, the hardening checks against real Postgres and Redis, a migration check (an empty database built from migrations equals the models, and the previous release's schema upgrades cleanly), a build of every image, and the full smoke test against the Compose stack. Merging deploys.

### 7.6 Security hygiene
- Secrets are per service and never in an image. The model key exists only in the optimizer worker.
- Images run as a non-root user, which they already do.
- Dependency scanning and automatic update proposals.
- Account-based sign-in lockout, correct client-address handling, and a production mode that switches the demo off.
- A way to revoke a session, so a stolen token can be cut off before it expires.

---

## 8. Deliberately left out

| Left out | Why |
|---|---|
| Kubernetes or any orchestrator | Compose shows the same architecture, and nothing here needs scheduling or autoscaling |
| Autoscaling on queue length | There is no load to scale against |
| A separate optimizer web service | One caller, a one-to-five-second function, one language. The contract keeps the door open |
| Kafka or another message system | Redis queues and the outbox cover the need |
| Postgres as the queue | It would replace Celery. The outbox gives the same safety without that |
| Read replicas, sharding, multi-region | Nothing here could use or demonstrate them |
| An API gateway or service mesh | There is one API service |
| Full distributed tracing | Correlation IDs are enough |
| A third Redis instance for events | Pub/sub stores nothing and shares the evicting instance |
| New webhook features | The feature is kept as it is, not extended |

---

## 9. What you can honestly claim afterwards

Each line is true only when its milestone is done and its drill passes.

| After | An honest claim |
|---|---|
| Outbox | Jobs are saved and published through a transactional outbox, so no accepted job is lost to a crash between the database and the queue |
| Fencing lease | Job ownership uses fencing tokens, so a paused or late worker can never overwrite a result |
| Redis split | Redis is split by failure behaviour: a queue instance that never evicts, and an evicting instance for cache and live fan-out |
| Services split | The API and workers are separate services, with the solver isolated on its own queue |
| Drills | A failure-drill suite that kills workers, Redis and the API and checks recovery |

Do not claim "zero message loss", throughput, user counts or latency under load. Nothing here measures the last three, and an interviewer will ask.
