"""
Milestone 4 proof: production mode shuts the demo door, and rate limits cannot be dodged.

Needs a running API started with APP_MODE=production, DEMO_ENABLED=true, DEV_OUTBOX=true and
TRUSTED_PROXY_HOPS=1 (so the flags that would open things are all on, and only the mode keeps them shut),
plus SQLALCHEMY_DATABASE_URI and REDIS_URL for the same stack.
Run from backend/:  python scripts/deploy/limits_check.py [BASE_URL]
"""
import asyncio
import random
import sys
import uuid
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from sqlalchemy import func, select  # noqa: E402
from sqlmodel import Session  # noqa: E402

from app.core.db import engine  # noqa: E402

ROOT = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8014").rstrip("/")
B = ROOT + "/api/v1"
ok = True


def check(label, cond, extra=""):
    global ok
    ok = ok and bool(cond)
    print(("PASS " if cond else "FAIL ") + label + (f"  [{extra}]" if extra else ""), flush=True)


def ip():
    return ".".join(str(random.randint(11, 250)) for _ in range(4))


def via(real, forged=None):
    """Headers as the hosting proxy would send them: whatever the visitor claimed, then the real address."""
    return {"X-Forwarded-For": f"{forged}, {real}" if forged else real}


print("\n== Production mode keeps the demo door and the dev outbox shut, whatever their flags say")
check("demo personas: not found", requests.get(f"{B}/demo/personas", timeout=30).status_code == 404)
check("enter as the demo agent: not found", requests.post(f"{B}/demo/load/Agent", timeout=30).status_code == 404)
check("dev outbox: not found", requests.get(f"{B}/dev/outbox", timeout=30).status_code == 404)

print("\n== Sign-in limit follows the real address, not the forged one")
real = ip()
codes = []
for i in range(12):
    r = requests.post(f"{B}/auth/login", data={"username": f"nobody{i}_{uuid.uuid4().hex[:4]}@example.com", "password": "wrong"},
                      headers=via(real, forged=ip()), timeout=30)
    codes.append(r.status_code)
check("10 attempts allowed, then refused, although every request claimed a different address",
      codes[:10] == [401] * 10 and codes[10:] == [429, 429], " ".join(map(str, codes)))
r = requests.post(f"{B}/auth/login", data={"username": "x@example.com", "password": "wrong"}, headers=via(ip(), forged=real), timeout=30)
check("a different visitor is not affected, even when claiming the blocked address", r.status_code == 401, str(r.status_code))
check("the refusal says when to try again", "Retry-After" in requests.post(f"{B}/auth/login", data={"username": "y@example.com", "password": "w"},
                                                                           headers=via(real), timeout=30).headers)

print("\n== Forgot-password: at most 3 emails per address per hour, same answer every time")
user_ip = ip()
email = f"forgot_{uuid.uuid4().hex[:6]}@example.com"
s = requests.post(f"{B}/auth/signup", json={"email": email, "password": "Forgot-Check-1", "full_name": "Forgot Check"}, headers=via(user_ip), timeout=30)
answers = [requests.post(f"{B}/auth/forgot", json={"email": email}, headers=via(ip()), timeout=30) for _ in range(4)]
from app.models.phase4 import OutboundMessage  # noqa: E402

with Session(engine) as ses:
    sent = ses.execute(select(func.count()).select_from(OutboundMessage).where(OutboundMessage.to == email, OutboundMessage.kind == "reset")).scalar()
check("four requests from four addresses send only three emails", s.status_code == 200 and sent == 3, f"{sent} sent")
check("and the answer never reveals the difference", len({a.text for a in answers}) == 1 and all(a.status_code == 200 for a in answers))

print("\n== If Redis is down")
from app.core import rate_limit  # noqa: E402


async def broken():
    raise ConnectionError("redis is down (simulated)")


rate_limit.get_queue_redis = broken
rate_limit.get_ephemeral_redis = broken
key = f"/api/v1/auth/login:{ip()}"
results = [asyncio.run(rate_limit.allow(key, 10, 60, True)) for _ in range(12)]
check("sign-in still limits, using the in-memory fallback", results[:10] == [True] * 10 and results[10:] == [False, False])
check("an ordinary route stays usable (fails open)", all(asyncio.run(rate_limit.allow(f"/api/v1/x:{ip()}", 1, 60, False)) for _ in range(5)))

print("\nALL PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
