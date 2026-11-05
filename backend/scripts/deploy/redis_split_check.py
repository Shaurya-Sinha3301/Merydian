"""
Milestone 7 proof: Redis is split by what happens when a key disappears.

Needs two Redis instances: REDIS_QUEUE_URL (never evicts) and REDIS_EPHEMERAL_URL (a small one that evicts),
plus SQLALCHEMY_DATABASE_URI for a migrated scratch database.
Run from backend/:  python scripts/deploy/redis_split_check.py
"""
import asyncio
import os
import sys
import threading
import time
import uuid
from pathlib import Path

import redis

sys.path[:0] = [str(Path(__file__).resolve().parents[2]), str(Path(__file__).resolve().parents[3])]
from app.core import locks, login_throttle, rate_limit  # noqa: E402
from app.core.celery_app import celery_app  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.redis import ephemeral_url, queue_url  # noqa: E402

ok = True
# One event loop for every async call: the app's async Redis clients belong to the loop that made them
LOOP = asyncio.new_event_loop()


def run(coro):
    return LOOP.run_until_complete(coro)


def check(label, cond, extra=""):
    global ok
    ok = ok and bool(cond)
    print(("PASS " if cond else "FAIL ") + label + (f"  [{extra}]" if extra else ""), flush=True)


Q = redis.from_url(os.environ["REDIS_QUEUE_URL"], decode_responses=True)
E = redis.from_url(os.environ["REDIS_EPHEMERAL_URL"], decode_responses=True)
s = uuid.uuid4().hex[:6]

print("\n== The two instances are set up for their roles")
check("queue Redis never evicts", Q.config_get("maxmemory-policy")["maxmemory-policy"] == "noeviction")
check("queue Redis keeps an append-only file", Q.config_get("appendonly")["appendonly"] == "yes")
check("ephemeral Redis evicts when full and keeps nothing on disk",
      E.config_get("maxmemory-policy")["maxmemory-policy"] == "allkeys-lru" and E.config_get("appendonly")["appendonly"] == "no")

print("\n== Every role lands on the right instance")
lock = f"trip:split-{s}"
token = locks.acquire(lock, 120)
check("trip locks are on the queue instance", Q.exists(f"lock:{lock}") and not E.exists(f"lock:{lock}"))
email = f"split_{s}@example.com"
run(login_throttle.record_failure(email))
check("sign-in lockout counters are on the queue instance", Q.exists(login_throttle._key(email)) and not E.exists(login_throttle._key(email)))
run(rate_limit.allow(f"/api/v1/auth/login:{s}", 10, 60, True))
run(rate_limit.allow(f"/api/v1/anything:{s}", 120, 60, False))
check("security rate limits count on the queue instance", Q.exists(f"rate_limit:/api/v1/auth/login:{s}"))
check("low-value rate limits count on the ephemeral instance", E.exists(f"rate_limit:/api/v1/anything:{s}") and not Q.exists(f"rate_limit:/api/v1/anything:{s}"))
celery_app.send_task("app.worker.process_event_task", args=[f"split-{s}"])
check("the Celery broker is the queue instance", Q.llen("event_queue") >= 1 and E.llen("event_queue") == 0, f"{Q.llen('event_queue')} waiting")

heard = []
sub = E.pubsub()
sub.subscribe(f"notif:split-{s}")


def listen():
    for m in sub.listen():
        if m["type"] == "message":
            heard.append(m["data"])
            return


threading.Thread(target=listen, daemon=True).start()
time.sleep(0.3)
from app.services import notification_service as ns  # noqa: E402

ns._push([(f"split-{s}", 42)])
time.sleep(0.5)
check("live notifications fan out on the ephemeral instance", heard == ["42"])
check("Celery stores no results in Redis (job state lives in Postgres)",
      celery_app.conf.task_ignore_result is True and not Q.keys("celery-task-meta-*") and not E.keys("celery-task-meta-*"))

print("\n== Filling and wiping the ephemeral instance costs speed, never correctness")
blob = "x" * 100_000
for i in range(150):  # about 15 MB into an instance capped well below that
    E.set(f"junk:{s}:{i}", blob)
check("the ephemeral instance evicted to make room instead of failing", E.dbsize() < 150 and E.info("stats")["evicted_keys"] > 0,
      f"{E.info('stats')['evicted_keys']} keys evicted")
check("nothing on the queue instance was touched: the lock, the lockout count and the queued message are all there",
      Q.exists(f"lock:{lock}") and Q.exists(login_throttle._key(email)) and Q.llen("event_queue") >= 1)
E.flushall()
check("after wiping the ephemeral instance the queue instance is unchanged", Q.exists(f"lock:{lock}") and Q.llen("event_queue") >= 1)
check("and the app keeps working: limits count again from zero", run(rate_limit.allow(f"/api/v1/anything:{s}", 120, 60, False)))
locks.release(lock, token)

print("\n== One instance is still enough for local runs and the showcase")
settings.REDIS_QUEUE_URL, settings.REDIS_EPHEMERAL_URL = "", ""
check("with only REDIS_URL set, both roles use it", queue_url() == ephemeral_url() == settings.REDIS_URL.strip())

Q.delete("event_queue")
print("\nALL PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
