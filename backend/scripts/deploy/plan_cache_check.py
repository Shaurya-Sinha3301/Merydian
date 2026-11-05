"""
Proof for the plan read cache (app/services/plan_cache.py): it follows Postgres on every change, never goes
back to an older plan, absorbs the burst of reads after an update, and never fails a read when it is down.

Needs a running API and worker on a seeded database (one API, so its read counters are the whole picture),
SQLALCHEMY_DATABASE_URI for the same database, REDIS_EPHEMERAL_URL pointing at a Redis of its own, and
STACK_CACHE_CONTAINER naming that Redis's Docker container (the check stops and starts it).
Run from backend/ through drills.py, or:  python scripts/deploy/stack.py --worker --env REDIS_EPHEMERAL_URL=... \
    scripts/deploy/plan_cache_check.py
"""
import os
import re
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from uuid import UUID

import redis
import requests

BACKEND = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(BACKEND), str(BACKEND.parent)]
from sqlalchemy import select  # noqa: E402
from sqlmodel import Session  # noqa: E402

from app.core.db import engine  # noqa: E402
from app.models.family import Family  # noqa: E402
from app.models.outbox import OutboxMessage  # noqa: E402
from app.services import outbox_service, plan_cache  # noqa: E402
from app.services.family_service import FamilyService  # noqa: E402
from app.services.itinerary_service import ItineraryService  # noqa: E402

ROOT = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8031").rstrip("/")
B = ROOT + "/api/v1"
CONTAINER = os.environ["STACK_CACHE_CONTAINER"]
R = redis.from_url(os.environ["REDIS_EPHEMERAL_URL"], decode_responses=True)
ok = True


def check(label, cond, extra=""):
    global ok
    ok = ok and bool(cond)
    print(("PASS " if cond else "FAIL ") + label + (f"  [{extra}]" if extra else ""), flush=True)


def reads():
    body = requests.get(f"{ROOT}/metrics", timeout=30).text
    out = {}
    for src in ("cache", "cache_after_wait", "postgres", "postgres_cache_down", "not_modified"):
        m = re.search(r'merydian_plan_reads_total\{source="' + src + r'"\} ([0-9.]+)', body)
        out[src] = int(float(m.group(1))) if m else 0
    return out


def delta(before, after, src):
    return after[src] - before[src]


def get(etag=None):
    h = {"Authorization": f"Bearer {TOKEN}"}
    if etag:
        h["If-None-Match"] = etag
    return requests.get(f"{B}/itinerary/current", headers=h, timeout=30)


def db_state():
    with Session(engine) as s:
        f = s.get(Family, FAM)
        return f.plan_rev, f.current_itinerary_version


def new_version(marker):
    return ItineraryService.create_itinerary(FAM, {"days": [], "total_cost": 1, "marker": marker},
                                            created_reason=f"cache check {marker}", created_by="check")


def wait_for(fn, seconds=30):
    end = time.time() + seconds
    while time.time() < end:
        v = fn()
        if v:
            return v
        time.sleep(0.5)
    return fn()


trav = requests.post(f"{B}/demo/load/Family_Vacation", timeout=60).json()
TOKEN, FAM = trav["access_token"], UUID(trav["user"]["family_id"])
KEY = plan_cache.key(FAM)

print("\n== Reads: the first comes from Postgres, the rest from the cache, an unchanged plan costs no body")
R.delete(KEY)
before = reads()
r1 = get()
r2 = get()
after = reads()
tag = r1.headers.get("ETag")
check("the plan is served with an ETag of family and revision", r1.status_code == 200 and tag and str(FAM) in tag, tag)
check("first read went to Postgres, the second to the cache", delta(before, after, "postgres") == 1 and delta(before, after, "cache") == 1,
      f"postgres +{delta(before, after, 'postgres')}, cache +{delta(before, after, 'cache')}")
check("both reads returned the same plan", r1.content == r2.content)
r3 = get(tag)
check("a browser holding the current revision gets 304 with no body", r3.status_code == 304 and not r3.content)

print("\n== Every change refreshes the cache before anyone asks")
before = reads()
new_version("v-new")
rev, _ = db_state()
cached_rev = R.hget(KEY, "rev")
check("the commit itself put the new plan in the cache", cached_rev == str(rev), f"cache rev {cached_rev}, Postgres rev {rev}")
r = get(tag)
after = reads()
check("the old ETag no longer matches: the new plan comes back in full", r.status_code == 200 and r.json().get("marker") == "v-new")
check("and it came from the cache, not Postgres", delta(before, after, "postgres") == 0, f"postgres +{delta(before, after, 'postgres')}")
tag = r.headers.get("ETag")

print("\n== The burst after an update: 50 pages re-fetch at once")
new_version("burst")
before = reads()
with ThreadPoolExecutor(50) as ex:
    res = list(ex.map(lambda _: get(), range(50)))
after = reads()
check("all 50 got the new plan", all(x.status_code == 200 and x.json().get("marker") == "burst" for x in res))
check("Postgres was read 0 times for them (the commit had already filled the cache)", delta(before, after, "postgres") == 0,
      f"postgres +{delta(before, after, 'postgres')}")

R.delete(KEY)
before = reads()
with ThreadPoolExecutor(50) as ex:
    res = list(ex.map(lambda _: get(), range(50)))
after = reads()
check("with the entry gone, 50 at once still read Postgres only once (one rebuilds, the rest wait for it)",
      delta(before, after, "postgres") == 1 and all(x.json().get("marker") == "burst" for x in res),
      f"postgres +{delta(before, after, 'postgres')}, waited +{delta(before, after, 'cache_after_wait')}")

print("\n== Old never overwrites new")
rev_now, _ = db_state()
stale = plan_cache.load(FAM)  # a slow reader that read Postgres just before the next change
new_version("newest")
written = R.eval(plan_cache._CAS, 1, KEY, stale[0], stale[1], 60)
check("a slow reader filling the cache late is refused", written == 0 and get().json().get("marker") == "newest")
plan_cache.refresh(FAM)
plan_cache.refresh(FAM)
check("a refresh delivered twice changes nothing", get().json().get("marker") == "newest")

threads = [threading.Thread(target=new_version, args=(f"race-{i}",)) for i in range(6)]
[t.start() for t in threads]
[t.join() for t in threads]
rev, cur = db_state()
with Session(engine) as s:
    from app.models.itinerary import Itinerary

    newest = s.get(Itinerary, cur).data.get("marker")
check("six writers at once: the revision went up by exactly six", rev == rev_now + 1 + 6, f"{rev_now + 1} -> {rev}")
check("and the cache holds the plan Postgres calls current", R.hget(KEY, "rev") == str(rev) and get().json().get("marker") == newest, newest)

print("\n== A revert moves the plan back, and the cache follows")
with Session(engine) as s:
    from app.models.itinerary import Itinerary

    first = s.execute(select(Itinerary).where(Itinerary.family_id == FAM).order_by(Itinerary.version)).scalars().first()
old_tag = get().headers["ETag"]
FamilyService.update_current_itinerary(FAM, first.id)
r = get()
check("after pointing the family at an older version, readers see that version at once",
      r.json() == first.data and r.headers["ETag"] != old_tag, f"version {first.version}")

print("\n== A refresh lost between Postgres and Redis is delivered by the outbox")
outbox_service._fast_path = False  # as if this process died right after its commit
new_version("lost")
outbox_service._fast_path = True
with Session(engine) as s:
    pending = s.execute(select(OutboxMessage).where(OutboxMessage.kind == "refresh_plan_cache",
                                                    OutboxMessage.status == "pending")).scalars().all()
check("the refresh was saved in the same transaction as the change", len(pending) >= 1)
check("the worker's dispatcher delivers it and the cache catches up",
      wait_for(lambda: get().json().get("marker") == "lost", 30))

print("\n== The cache going down costs speed, never a read")
subprocess.run(["docker", "stop", "-t", "1", CONTAINER], capture_output=True)
before = reads()
t0 = time.time()
r = get()
took = time.time() - t0
after = reads()
check("with the cache Redis stopped the plan still loads, from Postgres", r.status_code == 200 and r.json().get("marker") == "lost"
      and delta(before, after, "postgres_cache_down") == 1, f"first read {took:.2f} s")
check("the first read waits on the dead cache for at most about a second", took < 1.5, f"{took:.2f} s")
times = []
for _ in range(10):
    t0 = time.time()
    get()
    times.append(time.time() - t0)
check("the next reads skip it entirely (the breaker is open)", max(times) < 0.3, f"slowest of 10: {max(times) * 1000:.0f} ms")
t0 = time.time()
other = requests.get(f"{B}/notifications", headers={"Authorization": f"Bearer {TOKEN}"}, timeout=30)
check("and other requests do not stall on the rate limiter's counts either", time.time() - t0 < 0.5,
      f"{other.status_code} in {(time.time() - t0) * 1000:.0f} ms")
new_version("during-outage")
check("a change made during the outage is visible at once (reads go to Postgres)", get().json().get("marker") == "during-outage")
with Session(engine) as s:
    waiting = s.execute(select(OutboxMessage).where(OutboxMessage.kind == "refresh_plan_cache",
                                                    OutboxMessage.status == "pending")).scalars().all()
check("its cache refresh is kept for retry, not dropped", len(waiting) >= 1, f"{len(waiting)} waiting")
subprocess.run(["docker", "start", CONTAINER], capture_output=True)


def _up():
    try:
        return R.ping()
    except Exception:
        return False


wait_for(_up, 20)
check("after the cache comes back (empty) the retried refresh fills it with the current plan",
      wait_for(lambda: R.hget(KEY, "rev") == str(db_state()[0]), 90), f"rev {R.hget(KEY, 'rev')}")
check("and readers get the current plan from the cache again", get().json().get("marker") == "during-outage")

print("\nALL PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
