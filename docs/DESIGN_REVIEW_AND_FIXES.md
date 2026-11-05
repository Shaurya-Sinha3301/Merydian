# Design review: problems raised and the plan to fix them

A single report of every weakness raised in review of the target architecture, what is actually wrong, how it would fail, what we will do about it, and how we will prove it. No code. Nothing in this report has been built yet unless it says so.

The companion documents follow this report: `TARGET_ARCHITECTURE.md` (version 2) is the resulting design, and `ARCHITECTURE_PLAN.md` (version 2) is the milestone plan.

Related, already delivered: `PRODUCTION_HARDENING.md` covers the first round of fixes (stuck jobs, overwritten plans, sign-in lockout).

---

## 1. Summary

| # | Problem raised | Verdict | Fix | Built? |
|---|---|---|---|---|
| 1 | Job creation and Redis publishing are not atomic. A crash between them loses the job | **Correct** | Transactional outbox for job publishing, plus a scheduler that re-publishes lost jobs | Built |
| 2 | The lease needs stronger ownership guarantees | **Correct, and the current build has the gap** | Job ownership with a fencing number, heartbeat renewal, database-clock times | Built |
| 3 | Redis persistence does not mean zero message loss | **Correct** | Stop depending on Redis keeping messages. The database is the record, Redis only delivers | Built |
| 4 | Three Redis instances may be unnecessary | **Mostly correct** | Two instances: a queue instance and an ephemeral one. One is acceptable for the demo | Built |
| 5 | Webhooks are not needed, since SSE covers event notification | **Correct that they are not required.** Decision: the feature is **kept** | Keep it as an optional outbound channel, not extended. Delivery moves to the outbox | Built |
| 6 | (Found during review) A job turned away by a trip lock gives up after about four minutes and fails with a misleading message. Waiting jobs can also run out of order | A real gap in the current build | Retry until the job's own deadline, with sequence numbers where order matters | Built |

---

## 2. Problem 1: a crash between saving the job and publishing it

### What was raised
The API saves a job in Postgres, Postgres commits, and the API crashes before telling Redis. The job exists, but no worker ever hears of it. Saving the job and publishing it are not one atomic step.

### Why it happens
Two separate systems have to agree, and neither can commit the other's write. This is the classic "dual write" problem. The target diagram did not account for it: the outbox it described was only for notifications, not for creating jobs.

### The three places a job can be lost

| Gap | What is lost | Closed by |
|---|---|---|
| A. Saved, but the crash came before the message was published | The job exists and nobody knows | The outbox (below) |
| B. Published, then Redis loses the message | The job is queued but the message is gone | A scheduler that re-publishes |
| C. A worker took the message, then died | The job is running with no owner | The lease (problem 2) |

### How it would fail
An agent creates a trip. The API saves the job, then the container restarts for a deploy. The agent's screen shows "building your plan" forever, because no worker was ever told. Today the only protection is a check that fails the job after ten minutes, and only if someone looks at it.

### Fix: put the "tell a worker" step inside the database transaction
1. In one transaction, the API writes the job row **and** an outbox row that means "publish this job". Both commit or neither does. After the commit the intent to publish is durable even if the API dies an instant later.
2. A dispatcher reads pending outbox rows, publishes each to Redis, and marks the row sent.
3. The API returns the job ID right after the commit. It does not depend on Redis being up. If Redis is down when someone submits, the job is accepted and delivered when Redis returns.

Details that matter:
- **Fast path.** The API tries to publish immediately after the commit and marks the row sent. The dispatcher only acts if that did not finish, so the usual delay is close to zero. The database can also wake the dispatcher the moment a row is written, with a short polling loop as the safety net.
- **Several dispatchers are safe.** Each takes only rows that no other dispatcher has locked.
- **Retries.** A failing row is retried with growing waits and, after a set number of failures, parked for a person to look at.
- **Duplicates are expected and harmless.** If the dispatcher publishes and dies before marking the row sent, it will publish again. This is at-least-once delivery. Claiming a job is a conditional update, so a second message finds the job already running or finished and does nothing. At-least-once delivery plus a consumer that tolerates repeats behaves like exactly-once from the user's view.
- **Rejected approach: publishing before committing.** A worker could start before the row is visible, or a message could exist for a job the database never kept.
- **Rejected alternative: Postgres as the queue** (workers take rows by "skip what another worker locked"). It removes the gap by removing Redis from correctness, but means replacing Celery. The outbox gives the same safety without that.

### Second net: the scheduler re-publishes
Today a job queued for over ten minutes is simply failed. In the target design the scheduler first **re-publishes** any job that has been CREATED or QUEUED for more than about a minute with no sign of a worker. Because claiming is idempotent, a duplicate does no harm. After a few re-publishes, within an overall deadline, it marks the job failed with a clear reason. This also covers a message lost after it was published (gap B).

### Fit with the rest
If the browser retries after a crash, it sends the same idempotency key, and the server returns the same job, never a second one.

### How we will prove it
- Fault injection: stop the API process right after the commit, and show the job still runs within seconds.
- Stop Redis, submit a job, start Redis, and show the job runs.
- Flush the queue Redis with jobs waiting, and show the scheduler re-publishes them.

---

## 3. Problem 2: the lease needs stronger ownership

### What was raised
The lease implementation needs stronger ownership guarantees.

### What is wrong with the lease as built
The current rule: a job is owned by whoever last wrote "running" with a fresh timestamp. Another worker may take it once it has been silent for three minutes. Three weaknesses:

1. **No proof of ownership on the way out.** Finishing or failing a job does not check that the caller still owns it. A worker that was paused (a frozen virtual machine, a long stall) can wake up after its job was taken over, and still write its result. Two workers then both believe they finished the same job.
2. **One timestamp does two jobs.** Any update to the row moves it, so "last touched" is not the same as "owner is alive".
3. **Different machines' clocks are compared.** The timestamp comes from each worker's own clock, so a skewed clock can make a live job look expired.

The hard time limit makes weakness 1 unlikely, but not impossible: a frozen process is not enforcing its own limit.

### How it would fail
Worker A starts a replan and is frozen for four minutes. Its lease expires, worker B takes over and finishes the plan. A wakes up and completes the same job, publishing a second plan version and a second notification. The customer sees two different plans and two messages for one request.

### Fix: ownership with a fencing number
- **Explicit ownership fields on the job:** the owner, a **fencing number** that rises by one every time ownership changes hands, the lease expiry, and the owner's last heartbeat.
- **All times come from the database's clock,** never a worker's. No two machines' clocks are ever compared.
- **Claiming** is one conditional update: take the job if it is queued, or if it is running and its lease has expired. It raises the fencing number and returns it to the winner. Only one worker can win.
- **Heartbeat renewal.** While working, the owner extends its lease every thirty seconds with an update that says "only if the fencing number is still mine". If that changes no row, ownership was lost, and the worker stops at once and throws its work away. This allows a short lease of about ninety seconds, allows jobs longer than the lease, and detects a lost lease within seconds.
- **Every write by the owner carries the fencing number.** Completing, failing and retrying all say "only if the number is still mine". A late worker's write changes nothing.
- **The result and the completion are one transaction.** The transaction that saves the plan version, the iteration, the outbox rows and the "completed" mark first locks the job row and checks the fencing number. If it does not match, the whole transaction is abandoned. A takeover cannot slip in halfway, and once the job is completed nobody can claim it.
- **The Redis trip lock is demoted to an optimisation.** It stops two replans of one trip wasting effort at the same time, but correctness no longer depends on it. A lock can expire while its holder is paused. The fencing number, the row lock and the unique version rule hold regardless.
- **What cannot be fenced:** work done before the commit, such as a language-model call, may happen twice if ownership moved. Its result is discarded, and the cost is a duplicate call. Emails and notifications go through the outbox with stable event IDs, so a repeat is harmless.

### How we will prove it
Pause an owner past its lease with an injected stall. Let a second worker take the job and finish. Let the first resume and try to complete. The write must be refused: one plan version, one completion, no duplicate notification. A second drill stops the heartbeat and confirms the owner abandons its work within seconds.

### Status
This needs a database change, so it is built after the migrations milestone, as milestone 5a.

---

## 4. Problem 3: Redis persistence does not mean zero message loss

### What was raised
Persistence has different durability settings. Syncing once a second can lose about the last second of writes in a crash. Syncing on every write is stronger but slower.

### Verdict
Correct. The earlier design called the queue "durable". That overstated it. A replica that lags can also lose writes when it takes over.

### The rule we adopt
**Correctness must not depend on Redis keeping a message.**
- The job row and the outbox row are written in the database transaction (problem 1).
- The scheduler re-publishes any job with no sign of a worker.
- Therefore a lost message costs a minute of delay, not a job.
- Under that rule, syncing once a second is enough. The stronger setting is not worth its cost.

Said plainly on a resume: Redis is a delivery accelerator, and Postgres is what guarantees at-least-once delivery.

### How we will prove it
Flush the queue Redis with jobs waiting. Every job must still run exactly once from the user's point of view.

### Wording change
Wherever the design says "durable queue", it will say "persisted on a best-effort basis, never evicts, with the database as the record".

---

## 5. Problem 4: three Redis instances may be unnecessary

### What was raised
A proposed split: keep queue and locks apart, separate the cache only if eviction isolation is needed, and share events with the cache or deploy them separately only if justified.

### Verdict
Correct on the queue, and on events a stronger reason than cost applies: **pub/sub stores nothing.** A pub/sub message lives only for the instant it is delivered. Flushing or evicting a cache does not remove subscriptions. So live-notification fan-out shares the evicting instance at no cost beyond a shared failure domain.

### The decision: two instances

| Instance | Holds | If a key vanishes | Settings |
|---|---|---|---|
| **queue** | Celery broker, per-trip locks, sign-in lockout counters, worker heartbeats | A message is lost, a lock is released early, a lockout resets | Persistence with a once-per-second sync. **Never evicts** |
| **ephemeral** | Itinerary read cache, low-value rate-limit buckets, pub/sub for live notifications | A page is slower, or a browser misses one live nudge and picks it up on its next reconnect | No persistence. Evicts when full |

### Why the queue instance stays apart from the cache
Memory pressure from the cache must not be able to evict queued messages or sign-in counters. If the lockout counters lived on an evicting instance, an attacker could flood it to push the counters out and reset their own lockout. Which instance holds a security counter is itself a security decision.

### When one instance is enough
At this traffic, a single instance set to never evict, with an expiry on every key, works, because the cache cannot grow without bound. Local development and the single-container showcase use one. Two is the design target, not a requirement of the demo.

### Other details
The Celery result backend is switched off, because job state already lives in Postgres. Each role has its own connection setting, falling back to the old single setting, so a one-Redis environment still works.

---

## 6. Problem 5: webhooks are not needed

### What was raised
SSE does the work of event notification, so webhooks are unnecessary.

### Verdict
Correct that they are not required. They serve a different audience: SSE reaches browsers that are open, and webhooks call external systems that an agency integrates. This project has no external integrators, so nothing in the core flow depends on them.

### Decision
**The webhook feature stays**, and nothing is removed. It is treated as an optional outbound channel. It is not extended with new features, and nothing new is built on it.

### What changes
- **Delivery moves from inline to the outbox.** A webhook delivery becomes one more outbox row, handled by the default worker. This gives it the same crash-safety as every other announcement. Its behaviour is otherwise unchanged: signed requests, a timestamp, retries and a delivery log.
- **SSE is the primary channel.** An announcement is an in-app notification, an SSE push, and an email or SMS. If an agent is offline, email covers them. Webhooks are an extra for anyone who wants them.
- **A check to make before relying on it.** The private-address guard must be confirmed, in the code, to check the address again at send time and to refuse redirects. If it only checks when the endpoint is registered, an endpoint could be changed to point at an internal address afterwards. This is marked "to verify" in the design, and a drill covers it.

### Resume effect
Webhooks may be mentioned only if the smoke test check and the drill for the address guard are passing. Otherwise leave them out. They are not needed for any of the claims in section 11.

---

## 7. Problem 6: a gap found during the review

### What it is
When a replan arrives for a trip that is already being replanned, the job is sent back to be retried every eight seconds, up to thirty times. That is about four minutes. If the trip stays busy longer, the retries run out and the task stops, while the job's status never moved off "queued". Nothing is lost, because the stale-job check later marks it failed, but the message it gives does not explain why.

A second point: waiting jobs retry independently, so they can run out of order. The third message can run before the second.

### Fix
- A waiting job keeps retrying **until its own deadline**, not a fixed count, and if it runs out it fails with "this trip was busy" in plain words.
- Where order matters, such as several feedback messages from one customer, jobs carry a **sequence number**, and a job whose predecessor has not finished waits for it. Each job already starts from the latest saved plan, so no work is lost either way.

---

## 8. The resulting design

```
 Browser ──▶ API (stateless, light) ──▶ Postgres  ◀── the record of everything
                │   job row + outbox row, one transaction
                │
                ▼
          Dispatcher (default worker) ──▶ Redis "queue" (best-effort persistence, never evicts)
                                                │
                    ┌───────────────────────────┴──────────────┐
                    ▼                                          ▼
          Optimizer worker                              Default worker
          (solver, language model)                      (email, SMS, outbox)
                    │  one transaction: plan + iteration       │
                    │  + outbox rows + job completed,          │
                    │  checked against the fencing number      │
                    ▼                                          ▼
                Postgres                          Redis "ephemeral" (cache, pub/sub)
                                                           │
                                                           ▼
                                                    API copies ──▶ SSE to browsers

 Scheduler (one copy): re-publish lost jobs, fail abandoned jobs, retry stuck outbox rows,
                       expire keys. Every sweep is safe to repeat.
```

The three roles, in one line each:
- **Optimizer worker:** does the slow, CPU-heavy and model-calling work, one job per core, and owns each job under a fencing number.
- **Default worker:** does the small, quick, I/O-bound work: dispatching the outbox, sending email and SMS, and writing notifications.
- **Scheduler:** one copy, on a timer, noticing and repairing anything stuck.

The guarantees the design now makes:
- A job accepted by the API will be run, even if the API, Redis or a worker fails along the way.
- A job's result is written at most once, even if ownership moved.
- A lost Redis message costs time, not data.
- A cache flush costs speed, not correctness.

---

## 9. Order of work

```
 M1   Migrations baseline, real migrations from here on
 M2   Working state from files into the database
 M3   Idempotency keys
 M4   Production mode for the demo, correct client address, limiter
 M5   Transactional outbox, including job publishing
 M5a  Lease with fencing and heartbeat renewal
 M5b  Waiting jobs retry to a deadline, with sequence numbers where order matters
 M6   Trip creation as a job, with a hybrid wait response
 M7   Redis split into queue and ephemeral, result backend off
 M8   Two images, API and worker, one Compose file for everything
 M9   Two queues, optimizer worker and default worker, heartbeats
 M10  Scheduler: re-publish lost jobs, fail abandoned jobs, key expiry
 M11  Metrics, error tracking, readiness that includes the worker
 M12  Failure-drill script and the delivery pipeline
```

Dependencies: M1 comes first because every later step changes the schema. M5 comes before M6 because trip creation is the first request that depends on publishing. M5a changes the job table, so it comes after M1. If time is short, the cut line that keeps the most value is M1 to M5a, then M6, M8 and M12.

---

## 10. How we will prove all of it

Failure drills, run by a script and saved as repeatable output:

| Drill | What it proves |
|---|---|
| Stop the API right after a job is committed | The outbox delivers the job anyway |
| Stop Redis, submit a job, restart Redis | The job is accepted and then run |
| Flush the queue Redis with jobs waiting | The scheduler re-publishes them. Nothing is lost |
| Pause an owner past its lease, let another worker finish, wake the first | The late write is refused: one plan, one completion |
| Stop the heartbeat | The owner abandons its work within seconds |
| Kill the optimizer worker mid-job | Another worker takes over and finishes, or the job fails cleanly |
| Fill and flush the ephemeral Redis | Only speed is affected |
| Stop the worker after the plan is saved, before the notification | The outbox still delivers it |
| Send the same request ten times at once | One job, one plan version |
| Make a trip busy for longer than the old retry limit | The waiting job still runs, or fails with a clear reason |

---

## 11. What you can honestly claim afterwards

Each line is true only when its milestone is done and its drill passes.

| After | An honest claim |
|---|---|
| M5 | Jobs are saved and published through a transactional outbox, so no accepted job is lost to a crash between the database and the queue |
| M5a | Job ownership uses fencing tokens, so a paused or late worker can never overwrite a result |
| M7 | Redis is split by failure behaviour: a queue instance that never evicts, and an evicting instance for cache and live fan-out |
| M8 and M9 | The API and workers are separate services, with the solver isolated on its own queue |
| M12 | A failure-drill suite that kills workers, Redis and the API and checks recovery |

Do not claim "zero message loss". The honest wording is: **at-least-once delivery from the database, with idempotent consumers.** Do not claim throughput, user counts or latency under load, since nothing here measures them.

---

## 12. Decisions

1. **Webhooks:** decided. The feature is kept as an optional channel and not extended. Its delivery moves to the outbox (milestone 5).
2. **Documents:** aligned. `TARGET_ARCHITECTURE.md` and `ARCHITECTURE_PLAN.md` are at version 2 and match this report.
3. **Where to start:** done. All milestones are built; every fix in this report has a passing check (see `DRILL_REPORT.md`).
