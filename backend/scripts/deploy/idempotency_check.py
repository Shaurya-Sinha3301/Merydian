"""
Milestone 3 proof: repeating a request does not repeat its effects.

Needs a running API (seeded, demo enabled) and SQLALCHEMY_DATABASE_URI for the same database.
Run from backend/:  python scripts/deploy/idempotency_check.py [BASE_URL, default http://127.0.0.1:8013]
"""
import os
import sys
import threading
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from sqlalchemy import func, select, update  # noqa: E402
from sqlmodel import Session  # noqa: E402

from app.core.db import engine  # noqa: E402
from app.models.agent_job import AgentJob  # noqa: E402
from app.models.idempotency import IdempotencyKey  # noqa: E402
from app.models.user import User  # noqa: E402

B = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8013").rstrip("/") + "/api/v1"
ok = True


def check(label, cond, extra=""):
    global ok
    ok = ok and bool(cond)
    print(("PASS " if cond else "FAIL ") + label + (f"  [{extra}]" if extra else ""), flush=True)


def burst(n, fn):
    out = [None] * n
    def run(i):
        out[i] = fn()
    ts = [threading.Thread(target=run, args=(i,)) for i in range(n)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    return out


def users_with(email):
    with Session(engine) as s:
        return s.execute(select(func.count()).select_from(User).where(User.email == email)).scalar()


def jobs_with(message):
    with Session(engine) as s:
        return s.execute(select(func.count()).select_from(AgentJob).where(AgentJob.input_payload["message"].astext == message)).scalar()


agent = requests.post(f"{B}/demo/load/Agent", timeout=60).json()
AH = {"Authorization": f"Bearer {agent['access_token']}"}
trav = requests.post(f"{B}/demo/load/Family_Vacation", timeout=60).json()
TH = {"Authorization": f"Bearer {trav['access_token']}"}

print("\n== Adding a customer: ten identical requests at the same instant")
s = uuid.uuid4().hex[:6]
key = str(uuid.uuid4())
body = {"email": f"idem_{s}@example.com", "full_name": f"Idem {s}", "members": 2, "children": 0}
rs = burst(10, lambda: requests.post(f"{B}/agent/customers", json=body, headers={**AH, "Idempotency-Key": key}, timeout=60))
codes = sorted(r.status_code for r in rs)
check("exactly one customer account was created", users_with(body["email"]) == 1, f"responses {codes}")
check("every response is the result or 'already being processed'", all(c in (200, 201, 409) for c in codes))
again = requests.post(f"{B}/agent/customers", json=body, headers={**AH, "Idempotency-Key": key}, timeout=60)
first_ok = next(r for r in rs if r.status_code in (200, 201))
check("a later retry with the same key replays the saved answer", again.headers.get("Idempotent-Replayed") == "true" and again.json() == first_ok.json())
check("and still only one account exists", users_with(body["email"]) == 1)

print("\n== Misuse and edge cases")
other = dict(body, full_name="Someone else")
r = requests.post(f"{B}/agent/customers", json=other, headers={**AH, "Idempotency-Key": key}, timeout=60)
check("the same key with a different body is refused", r.status_code == 422, str(r.status_code))
r = requests.post(f"{B}/agent/customers", json=dict(body, email=f"other_{s}@example.com"), headers={**AH, "Idempotency-Key": key}, timeout=60)
check("a key cannot be reused for another record", r.status_code == 422 and users_with(f"other_{s}@example.com") == 0)
r = requests.post(f"{B}/agent/customers", json=body, headers={**TH, "Idempotency-Key": key}, timeout=60)
check("another caller's identical key is independent (no replay of someone else's answer)", r.headers.get("Idempotent-Replayed") != "true")
with Session(engine) as ses:
    ses.execute(update(IdempotencyKey).where(IdempotencyKey.key == key).values(expires_at=datetime.utcnow() - timedelta(seconds=1)))
    ses.commit()
r = requests.post(f"{B}/agent/customers", json=body, headers={**AH, "Idempotency-Key": key}, timeout=60)
check("after the key expires, the request runs again as new", r.headers.get("Idempotent-Replayed") != "true", f"HTTP {r.status_code}")
b1 = dict(body, email=f"nokey1_{s}@example.com")
requests.post(f"{B}/agent/customers", json=b1, headers=AH, timeout=60)
b2 = dict(body, email=f"nokey2_{s}@example.com")
requests.post(f"{B}/agent/customers", json=b2, headers=AH, timeout=60)
check("requests without a key behave exactly as before", users_with(b1["email"]) == 1 and users_with(b2["email"]) == 1)

print("\n== Feedback: the request that costs a language-model call and a replan")
msg = f"Idempotency check {s}: please keep the days shorter."
fkey = str(uuid.uuid4())
rs = burst(10, lambda: requests.post(f"{B}/itinerary/feedback/agent", json={"message": msg}, headers={**TH, "Idempotency-Key": fkey}, timeout=60))
ids = {r.json().get("job_id") for r in rs if r.status_code == 200}
check("ten identical submissions with one key start exactly one job", jobs_with(msg) == 1, f"responses {sorted(r.status_code for r in rs)}")
check("and every successful answer names that same job", len(ids) == 1)

msg2 = f"Double click {s}: add a long lunch."
a = requests.post(f"{B}/itinerary/feedback/agent", json={"message": msg2}, headers=TH, timeout=60).json()
b = requests.post(f"{B}/itinerary/feedback/agent", json={"message": msg2}, headers=TH, timeout=60).json()
check("without a key, a double-click within 30 seconds follows the first job", a.get("job_id") == b.get("job_id") and jobs_with(msg2) == 1)

print("\n== A server error releases the key so the client can retry")
from app.core import idempotency as idem  # noqa: E402

scope, endpoint, k = "check-scope", "POST /api/v1/check", str(uuid.uuid4())
assert idem._claim(scope, endpoint, k, "h") is None
idem._finish(scope, endpoint, k, 500, "application/json", b"{}")
check("after a 500 the key is free again", idem._claim(scope, endpoint, k, "h") is None)
idem._release(scope, endpoint, k)

print("\nALL PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
