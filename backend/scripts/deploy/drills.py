"""
Run every check and failure drill, each on its own scratch database, and write docs/DRILL_REPORT.md.

Needs the local Postgres and Redis (docker compose up postgres redis), Docker (the drills start a few
throwaway containers of their own), and the backend's Python environment. With --images it also builds the
API and worker images and runs the split-architecture drills against them (slow: about 10 minutes more).

Run from backend/:  python scripts/deploy/drills.py [--images] [--only name,name]
"""
import argparse
import datetime
import os
import re
import subprocess
import sys
import time
import uuid
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

BACKEND = Path(__file__).resolve().parents[2]
REPO = BACKEND.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from stack import _admin, _dotenv  # noqa: E402

DRILL_PG = ("drill-pg", 5433, "postgresql://drill:drill-local-only@127.0.0.1:5433/drill")
SHORT_LEASE = ["--env", "JOB_LEASE_SECONDS=20", "--env", "JOB_HEARTBEAT_SECONDS=5", "--env", "SCHEDULER_SWEEP_SECONDS=10",
               "--env", "SCHEDULER_LOST_AFTER_SECONDS=10", "--env", "SCHEDULER_TICK_SECONDS=3"]

# (name, what it proves, how to run it)
DRILLS = [
    ("migrations", "Schema changes are migrations only; old databases are adopted or refused, never guessed", ("db", "check_migrations.py", False)),
    ("hardening", "One owner per job, no overwritten plans, sign-in lockout", ("db", "hardening_check.py", True)),
    ("stateless", "The optimizer keeps no state on disk; any worker can run any job", ("db", "stateless_check.py", True)),
    ("fencing", "A paused or late worker can never write a result; waiting jobs keep order and deadline", ("db", "fencing_check.py", True)),
    ("scheduler", "Lost and abandoned jobs are repaired without anyone looking; only one scheduler acts", ("db", "scheduler_check.py", True)),
    ("redis-split", "A full or wiped cache costs speed, never queued work or security counters", ("redis",)),
    ("idempotency", "Ten identical requests make one record and one job", ("stack", "idempotency_check.py", [])),
    ("limits", "Production shuts the demo door; limits follow the real address; sign-in survives Redis loss",
     ("stack", "limits_check.py", ["--env", "APP_MODE=production", "--env", "DEMO_ENABLED=true", "--env", "DEV_OUTBOX=true",
                                   "--env", "TRUSTED_PROXY_HOPS=1"])),
    ("outbox", "No accepted job or announcement is lost between the database and the queue",
     ("stack", "outbox_check.py", ["--worker", "--env", "WEBHOOK_ALLOW_PRIVATE=true"])),
    ("nonblocking", "The API never waits on a solve", ("stack", "nonblocking_check.py", ["--worker"])),
    ("observability", "Failures are visible: metrics, error groups, readiness with reasons, one id end to end",
     ("stack", "observability_check.py", ["--worker"])),
    ("plan-cache", "The plan cache follows every change, never goes back to an older plan, absorbs bursts and survives being down",
     ("cache",)),
    ("resilience", "Database restart, an API copy dying under a live stream, webhook address changed, sign out everywhere",
     ("resilience",)),
    ("images", "The split images: API has no solver, two queues, heartbeats, workers stopped and killed", ("images",)),
]


def docker(*args):
    return subprocess.run(["docker", *args], capture_output=True, encoding="utf-8", errors="replace")


def run(cmd, env=None, timeout=2400):
    t0 = time.time()
    r = subprocess.run(cmd, cwd=BACKEND, env=env or os.environ, capture_output=True, encoding="utf-8", errors="replace", timeout=timeout)
    return r, time.time() - t0


def db_env(db, server):
    return dict(os.environ, SQLALCHEMY_DATABASE_URI=urlunsplit(urlsplit(server)._replace(path="/" + db)),
                REDIS_URL="redis://127.0.0.1:6379/13", REDIS_QUEUE_URL="", REDIS_EPHEMERAL_URL="", CELERY_BROKER_URL="",
                SECRET_KEY="x" * 32, PYTHONPATH=os.pathsep.join([str(BACKEND), str(REPO)]), PYTHONIOENCODING="utf-8")


def drill(kind, server):
    py = sys.executable
    if kind[0] == "db":
        _, script, bootstrap = kind
        db = f"drill_{uuid.uuid4().hex[:8]}"
        con = _admin(server)
        con.cursor().execute(f'CREATE DATABASE "{db}"')
        con.close()
        env = db_env(db, server)
        try:
            if bootstrap:
                run([py, "scripts/db_bootstrap.py"], env)
            return run([py, f"scripts/deploy/{script}"], env)
        finally:
            con = _admin(server)
            con.cursor().execute(f'DROP DATABASE IF EXISTS "{db}" WITH (FORCE)')
            con.close()
    if kind[0] == "redis":
        docker("rm", "-f", "drill-redis-queue", "drill-redis-eph")
        docker("run", "-d", "--name", "drill-redis-queue", "-p", "6391:6379", "redis:7-alpine", "redis-server", "--maxmemory", "64mb",
               "--maxmemory-policy", "noeviction", "--appendonly", "yes", "--appendfsync", "everysec")
        docker("run", "-d", "--name", "drill-redis-eph", "-p", "6392:6379", "redis:7-alpine", "redis-server", "--maxmemory", "4mb",
               "--maxmemory-policy", "allkeys-lru", "--save", "", "--appendonly", "no")
        time.sleep(2)
        db = f"drill_{uuid.uuid4().hex[:8]}"
        con = _admin(server)
        con.cursor().execute(f'CREATE DATABASE "{db}"')
        con.close()
        env = dict(db_env(db, server), REDIS_QUEUE_URL="redis://127.0.0.1:6391/0", REDIS_EPHEMERAL_URL="redis://127.0.0.1:6392/0")
        try:
            run([py, "scripts/db_bootstrap.py"], env)
            return run([py, "scripts/deploy/redis_split_check.py"], env)
        finally:
            docker("rm", "-f", "drill-redis-queue", "drill-redis-eph")
            con = _admin(server)
            con.cursor().execute(f'DROP DATABASE IF EXISTS "{db}" WITH (FORCE)')
            con.close()
    if kind[0] == "stack":
        _, script, extra = kind
        return run([py, "scripts/deploy/stack.py", *extra, f"scripts/deploy/{script}"])
    if kind[0] == "cache":
        name = "drill-redis-cache"
        docker("rm", "-f", name)
        docker("run", "-d", "--name", name, "-p", "6393:6379", "redis:7-alpine", "redis-server", "--maxmemory", "64mb",
               "--maxmemory-policy", "allkeys-lru", "--save", "", "--appendonly", "no")
        time.sleep(2)
        try:
            return run([py, "scripts/deploy/stack.py", "--worker", "--port", "8051", "--env", "REDIS_EPHEMERAL_URL=redis://127.0.0.1:6393/0",
                        "scripts/deploy/plan_cache_check.py"], dict(os.environ, STACK_CACHE_CONTAINER=name))
        finally:
            docker("rm", "-f", name)
    if kind[0] == "resilience":
        name, port, url = DRILL_PG
        docker("rm", "-f", name)
        docker("run", "-d", "--name", name, "-e", "POSTGRES_USER=drill", "-e", "POSTGRES_PASSWORD=drill-local-only",
               "-e", "POSTGRES_DB=drill", "-p", f"{port}:5432", "postgres:15-alpine")
        for _ in range(60):
            if docker("exec", name, "pg_isready", "-q").returncode == 0:
                break
            time.sleep(1)
        time.sleep(2)
        try:
            return run([py, "scripts/deploy/stack.py", "--apis", "2", "--port", "8041", "--worker", "--scheduler", *SHORT_LEASE,
                        "--db-server", url, "scripts/deploy/resilience_check.py"], dict(os.environ, STACK_DB_CONTAINER=name))
        finally:
            docker("rm", "-f", name)
    if kind[0] == "images":
        for target, tag in (("api", "merydian-api:local"), ("worker", "merydian-worker:local")):
            b = subprocess.run(["docker", "build", "-q", "--target", target, "-t", tag, "."], cwd=REPO, capture_output=True,
                               encoding="utf-8", errors="replace")
            if b.returncode:
                return subprocess.CompletedProcess(b.args, 1, f"FAIL image build {target}\n", b.stderr), 0.0
        return run([py, "scripts/deploy/image_stack.py"])
    raise ValueError(kind)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--images", action="store_true", help="also build the images and run the split-architecture drills")
    ap.add_argument("--only", default="", help="comma-separated drill names")
    ap.add_argument("--report", default=str(REPO / "docs" / "DRILL_REPORT.md"))
    a = ap.parse_args()
    server = (os.environ.get("SQLALCHEMY_DATABASE_URI") or _dotenv()["SQLALCHEMY_DATABASE_URI"]).replace("postgresql+psycopg2://", "postgresql://")
    wanted = set(filter(None, a.only.split(",")))
    rows, failures = [], []
    for name, proves, kind in DRILLS:
        if wanted and name not in wanted:
            continue
        if name == "images" and not a.images:
            rows.append((name, proves, 0, 0, "skipped (run with --images)", 0.0))
            continue
        print(f"--- {name}", flush=True)
        try:
            r, secs = drill(kind, server)
            out = (r.stdout or "") + (r.stderr or "")
        except Exception as e:  # a drill that cannot even start is a failure, reported as such
            out, secs = f"FAIL could not run: {e}\n", 0.0
            r = subprocess.CompletedProcess([], 1)
        passed = len(re.findall(r"^PASS ", out, re.M))
        failed = re.findall(r"^FAIL .*", out, re.M)
        result = "passed" if r.returncode == 0 and not failed else "FAILED"
        failures += [f"{name}: {line}" for line in failed] or ([f"{name}: exited with {r.returncode}"] if r.returncode else [])
        rows.append((name, proves, passed, len(failed), result, secs))
        print(f"    {result}: {passed} passed, {len(failed)} failed, {secs:.0f} s", flush=True)

    commit = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=REPO, capture_output=True, encoding="utf-8").stdout.strip()
    dirty = subprocess.run(["git", "status", "--porcelain", "--untracked-files=no"], cwd=REPO, capture_output=True, encoding="utf-8").stdout.strip()
    if dirty:
        commit += "` plus uncommitted changes (`git status` was not clean"
    total_pass = sum(r[2] for r in rows)
    total_fail = sum(r[3] for r in rows)
    lines = [
        "# Drill report", "",
        f"Generated by `backend/scripts/deploy/drills.py` on {datetime.datetime.now():%Y-%m-%d %H:%M} at commit `{commit}`.",
        "Each drill runs on its own scratch database; the stack drills start real API and worker processes, and the",
        "resilience and image drills start throwaway Docker containers. Nothing here is mocked.", "",
        f"**{total_pass} checks passed, {total_fail} failed.**", "",
        "| Drill | What it proves | Passed | Failed | Result | Time |", "|---|---|---|---|---|---|",
    ]
    lines += [f"| {n} | {p} | {ok} | {bad} | {res} | {s:.0f} s |" for n, p, ok, bad, res, s in rows]
    if failures:
        lines += ["", "## Failures", ""] + [f"- {f}" for f in failures]
    Path(a.report).write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nReport written to {a.report}: {total_pass} passed, {total_fail} failed")
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
