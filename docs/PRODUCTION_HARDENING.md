# Production hardening report

What the backend lacked when it first went live, why it lacked it, how it would have gone wrong, what was built to fix it, and what is still open.

This report covers the three weaknesses fixed on 4 November 2026. It does not include code. It describes the design decisions.

---

## 1. Why these gaps existed

The backend was built to prove an idea: a family sends feedback, a language model turns it into constraints, an optimizer builds a new plan, an agent approves. Prototypes are written for a **single user, a single server, and a path where nothing breaks**. Production is the opposite: many users, servers that restart without warning, and people who click twice, retry, or try to break in.

Every gap below comes from one of those three assumptions:

| Prototype assumption | What production does instead |
|---|---|
| Only one thing happens at a time | Two requests for the same trip arrive in the same second |
| A server never dies mid-task | A free-tier server restarts several times a day |
| Everyone who signs in is who they say they are | Strangers guess passwords in bulk |

None of the three was a coding mistake. They were gaps in **system design**: nobody had asked what happens when the assumption is false.

---

## 2. Summary

| # | Weakness | Plain-language risk | Status |
|---|---|---|---|
| 1 | Jobs could get stuck forever | A customer's "working on it" spinner never ends | Fixed |
| 2 | Two replans could overwrite each other | A family's newer plan silently replaced by an older one | Fixed |
| 3 | No lockout on sign-in | Anyone can try thousands of passwords on one account | Fixed |
| 4–8 | Open demo door, double-submit cost, schema drift, temporary files, single worker | See section 7 | Not fixed, documented |

---

## 3. Weakness 1: jobs that never finish

### What we lacked
Each background job (a replan after feedback) has a status: queued, running, completed or failed. A worker "claims" a job by switching it from queued to running. The claim rule was: **only a queued job can be claimed**. There was no rule for a job that was running when its worker died, and nothing that ever cleaned up such a job.

### Why we lacked it
The claim rule was designed to stop two workers from running the same job, and it does that well. The designers thought about the **second worker** but not the **dead worker**. On a laptop, workers do not die in the middle of a job.

### How it would have gone wrong
A customer sends feedback. A worker starts the job and marks it running. Render restarts the container (it does this on the free tier, and on every deploy). The message queue hands the job to a new worker, but the new worker looks at the job, sees "running", and refuses it: *"someone else has this."* Nobody does. The job stays running forever. The customer sees a spinner for the rest of the day.

Think of a coat-check ticket for a coat that was claimed by a clerk who then left the building. The ticket says "being handled", so no other clerk will touch it, and the coat is never returned.

### What was built
Three ideas working together:

1. **A lease.** Taking a job now gives the worker a lease of three minutes. If the job has shown no sign of life for longer than the lease, the next worker may take it over. A healthy job, which finishes in well under three minutes, is never touched.
2. **A cap on takeovers.** A job may be attempted three times in total. A job that has used its attempts is not run again, so a job that crashes every worker cannot crash them forever.
3. **A safety net for the waiting person.** When anyone checks a job's status, the system looks at its age. A job that has been running for more than twice the lease, or has sat in the queue for ten minutes without being picked up, is marked failed with a plain message. The customer is told the truth instead of being left waiting.

### The three clocks
This design only works if three time limits agree with each other. They are deliberately ordered:

- The hard limit on one task is 150 seconds.
- The lock on a trip (section 4) lasts 170 seconds, just above the hard limit, so a task cannot outlive its lock.
- The lease is 180 seconds, just above the lock, so a healthy job is never taken over.
- The queue re-delivers an unacknowledged task after 200 seconds, down from Redis's default of one hour, so a crashed task is retried within minutes, not hours.

If any two of these were reversed, either live jobs would be stolen from healthy workers or dead jobs would wait far too long.

### Evidence
Tested against a real database: twelve workers racing for one job produced exactly one winner. A job with an expired lease was taken over and counted as a new attempt. A healthy running job was left alone. A job that had used all its attempts was not run again. A job abandoned by a dead worker was failed rather than left spinning, and a job never picked up after ten minutes was failed.

### Trade-off
A job could be taken over while the original worker is only very slow, not dead. The claim rule still lets only one worker finish the update, but the slow one may waste effort. The three-minute lease, set above the task hard limit, makes this practically impossible, because a task past 150 seconds is killed by the system.

---

## 4. Weakness 2: two replans overwriting each other

### What we lacked
Saving a new plan version followed this routine: read the latest version number, add one, save. There was no lock around it, and the database had no rule saying two plans for the same family could not share a version number. The pointer that says "this is the family's current plan" was updated in a second, separate step.

### Why we lacked it
It is correct for one writer. The weakness only appears when two writers act in the same fraction of a second, which a developer testing by hand never does.

### How it would have gone wrong
A family has plan version 4. Two replans start at once, because two people on the same trip each sent feedback. Both read "latest is 4". Both save "version 5". Now two different plans are both called version 5. Then both update the "current plan" pointer, and whichever finishes last wins, regardless of which plan is newer.

It is like two people editing the same shared document offline. When both save, one person's changes vanish, and neither of them is told.

### Measured before the fix
We ran the old code with 20 replans started at the same moment for one family:

- 20 plans were saved, but they used only **7 different version numbers**.
- **4 version numbers were shared** by two or more different plans.
- The "current plan" pointer ended on **version 6, while the newest was version 7**.

So the customer would have been shown an older plan than the newest one, and the history could not say which plan was which.

### What was built
Defence in three layers, so that no single layer has to be perfect:

1. **Don't start the clash (per-trip lock).** Before a replan job begins, it takes a lock on the trip, held in Redis. If another replan for the same trip is running, the second job waits eight seconds and tries again. This is the layer that prevents two replans from starting from the same old plan, which also saves time and language-model cost.
2. **Don't corrupt on a clash (database row lock).** When a new version is saved, the database locks that family's record first. Concurrent writers for one family queue up and take turns, so each one reads the true latest version number. The version number and the "current plan" pointer are now saved in a single step, so the pointer can never land on an older version than the newest one saved.
3. **Refuse the impossible (a rule in the database).** The database now enforces that one family cannot have two plans with the same version number. If everything else failed, the database would reject the second plan instead of quietly keeping both.

The lock in layer 1 expires by itself, so a crashed worker cannot block a trip forever. It also checks who holds it: only the worker that took the lock can release it.

If Redis itself is down, layer 1 steps aside rather than stopping all replanning, and layers 2 and 3 still protect the data.

### Evidence after the fix
Twenty simultaneous replans for one family: all 20 saved, none failed, version numbers exactly 1 to 20 with no duplicates, the "current plan" pointer on the newest version, and the whole thing finished in about 0.2 seconds. An attempt to insert a duplicate version number directly into the database was refused. The lock tests confirmed that the second worker is turned away, a stranger cannot release someone else's lock, and a lock whose holder crashed expires on its own.

### Trade-off
Replans for the same trip now run one after another instead of in parallel. That is intended: two plans built from the same old starting point would have thrown away one another's work.

---

## 5. Weakness 3: no lockout on sign-in

### What we lacked
The only protection against password guessing was a general limit of 100 requests a minute per visitor address per page. There was no memory of failed attempts for a given account. The limiter also let everyone through when Redis was down, and trusted address information from the sender, which an attacker can fake to look like many different visitors.

### Why we lacked it
A general rate limit feels like protection, and it works against a single clumsy script. It does not address an attacker who is patient, uses many addresses, or targets one account.

### How it would have gone wrong
Someone wants into a travel agent's account. They try common passwords, a few dozen a minute, from addresses that keep changing. Nothing ever says "this account is under attack". Eventually one guess is right.

It is a door with a lock that anyone may try as many times as they like, with only a rule that you may not try more than 100 keys a minute. It does not matter that the keys are all wrong.

### What was built
A lockout that follows the **account**, not the visitor:

- Five wrong passwords for one email within 15 minutes lock sign-in for that email until the 15 minutes pass.
- While locked, even the correct password is refused. This is what stops an attacker who gets lucky on the sixth try.
- A successful sign-in clears the count.
- The count is kept for any email typed, whether or not an account exists, and the response is identical. An attacker therefore cannot use the lockout to discover which emails are registered.
- Other accounts are unaffected.

Because the lockout is tied to the account, it does not matter how many addresses the attacker uses or whether the address information is forged.

### Evidence
Through the real API: five wrong passwords returned the normal "incorrect" answer. The sixth attempt was refused with "too many failed attempts, try again in 14 minutes, or reset your password". The correct password was also refused while locked. A different account signed in normally. After the lock window passed, the correct password worked again.

### Trade-offs, stated plainly
- **A lockout can be abused.** Someone can deliberately lock out a victim by typing wrong passwords for their email. We accept this because the lock is short (15 minutes), the person can reset their password by email, and the alternative is leaving every account open to guessing. Larger systems often add a challenge (a puzzle) before locking.
- **If Redis is down, the lockout does not work.** We chose availability: people can still sign in, and the failure is logged. A stricter system would refuse sign-ins instead.
- The standard "retry after" header is not passed on by the API's error formatter, but the wait time is in the message text.

---

## 6. How it was tested

All tests ran against real PostgreSQL 15 and Redis 7 in Docker, not mocks, because these are exactly the kinds of bugs that only appear when a real database arbitrates between real simultaneous requests. A repeatable script is saved in the repository as `backend/scripts/deploy/hardening_check.py`, and it prints a pass or fail for each of 23 checks.

Beyond the targeted checks, the full customer-and-agent flow was run end to end on the local stack with a real background worker: an agent adds a customer, the optimizer builds a plan, the agent approves it, the customer sends feedback, and the new plan version appears. It passed with the new lock and lease in the path.

**Not yet verified:** the fixes have not run on the live Render and Neon deployment. They will be live after the next deploy, and the same checks should be re-run there.

---

## 7. What is still open

These were found in the same audit. They are real, and they were left alone on purpose to keep this change focused.

| # | Gap | Plain-language risk | Suggested next step |
|---|---|---|---|
| 4 | The demo "enter as agent" door gives an agent session to anyone | Fine for a showcase; in a real product it is a door left open | Turn the demo off on any deployment that is not a showcase |
| 5 | No protection against double-submit | A double-click on Send costs two language-model calls and creates two plan versions | Accept an idempotency key on feedback requests |
| 6 | Schema changes are not migrated on an existing database | Adding a field in code, then deploying, leaves the live table without it and requests fail | Move from create-if-missing to real migrations |
| 7 | Plan files are saved on the container's temporary disk | A restart erases them. The database is the real record, but anything reading those files breaks | Move files into the database or object storage |
| 8 | One container runs the API and the single worker | A long replan competes with page loads; the free service sleeps when idle | Separate the worker, add a second one |
| 9 | The rate limiter trusts forwarded address information from any sender, and lets everyone through when Redis is down | The general limit can be dodged | Trust only the hosting provider's proxy |

---

## 8. What was decided, in one page

1. **Assume the server will die.** Give every running job an expiry and a way for another worker to take over. Fail loudly instead of waiting forever.
2. **Assume two things will happen at once.** Serialise the work that must be one-at-a-time, at the cheapest layer first (a lock), then at the data layer (a row lock), and finally with a rule the database enforces.
3. **Never rely on one layer.** Each risk has two or three protections, so a failure of one does not corrupt data.
4. **Prefer availability when the helper service is down, but say so.** Redis outages do not stop replanning or sign-in, and each such skip is written to the log.
5. **Make timing numbers agree.** The task limit, the lock, the lease and the queue redelivery are ordered on purpose.
6. **Measure before and after.** The race went from 7 distinct version numbers across 20 plans to 20 out of 20, and every claim in this report was run, not assumed.
