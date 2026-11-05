"""
A throwaway local stack for the checks: a scratch database (migrated and seeded), one or more API processes
and, optionally, a worker serving every queue. Runs one check script against it, then tears everything down.

Needs Postgres and Redis (the local ones from docker-compose are fine) and the backend's Python environment.
Credentials come from SQLALCHEMY_DATABASE_URI / REDIS_URL in the environment or the repo's .env file.

    python scripts/deploy/stack.py --apis 2 --worker --env WEBHOOK_ALLOW_PRIVATE=true scripts/deploy/outbox_check.py

The check script receives the first API's address as its first argument; every API address is also in
STACK_API_URLS and their process ids in STACK_API_PIDS. The worker's log goes to backend/worker_check.log.
"""
import argparse
import os
import subprocess
import sys
import time
import uuid
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

BACKEND = Path(__file__).resolve().parents[2]
REPO = BACKEND.parent


def _dotenv() -> dict:
    out = {}
    path = REPO / ".env"
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def _admin(db_server: str):
    import psycopg2

    con = psycopg2.connect(urlunsplit(urlsplit(db_server)._replace(path="/postgres")))
    con.autocommit = True
    return con


def _wait_http(url: str, seconds: int = 120) -> bool:
    import requests

    end = time.time() + seconds
    while time.time() < end:
        try:
            if requests.get(url, timeout=2).status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(1)
    return False


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--apis", type=int, default=1, help="how many API processes")
    ap.add_argument("--port", type=int, default=8031, help="first API port")
    ap.add_argument("--worker", action="store_true", help="also run a Celery worker on every queue")
    ap.add_argument("--scheduler", action="store_true", help="also run the scheduler")
    ap.add_argument("--env", action="append", default=[], help="extra KEY=VALUE for every process")
    ap.add_argument("--db-server", default=None, help="Postgres server URL (default: from the environment / .env)")
    ap.add_argument("--redis-db", type=int, default=5, help="Redis database number to use (and flush)")
    ap.add_argument("--no-seed", action="store_true")
    ap.add_argument("script")
    ap.add_argument("script_args", nargs=argparse.REMAINDER)
    a = ap.parse_args()

    dot = _dotenv()
    server = a.db_server or os.environ.get("SQLALCHEMY_DATABASE_URI") or dot["SQLALCHEMY_DATABASE_URI"]
    server = server.replace("postgresql+psycopg2://", "postgresql://")
    redis_base = (os.environ.get("REDIS_URL") or dot.get("REDIS_URL") or "redis://127.0.0.1:6379/0").rsplit("/", 1)[0]
    db = f"stack_{uuid.uuid4().hex[:8]}"
    con = _admin(server)
    con.cursor().execute(f'CREATE DATABASE "{db}"')
    con.close()

    env = dict(os.environ)
    env.update({
        "SQLALCHEMY_DATABASE_URI": urlunsplit(urlsplit(server)._replace(path="/" + db)),
        "REDIS_URL": f"{redis_base}/{a.redis_db}", "REDIS_QUEUE_URL": "", "REDIS_EPHEMERAL_URL": "",
        "CELERY_BROKER_URL": "", "SECRET_KEY": env.get("SECRET_KEY") or "stack-" + "k" * 32,
        "GROQ_API_KEY": env.get("GROQ_API_KEY") or dot.get("GROQ_API_KEY", ""), "GROQ_MODEL": "openai/gpt-oss-20b",
        "APP_MODE": "showcase", "DEMO_ENABLED": "true", "DEMO_ADMIN_KEY": "stack-admin", "AGENT_SIGNUP_CODE": "check-code",
        "WORKER_HEARTBEAT_SECONDS": "5", "PYTHONPATH": os.pathsep.join([str(BACKEND), str(REPO)]), "PYTHONIOENCODING": "utf-8",
    })
    env.pop("MIGRATION_DATABASE_URI", None)
    for pair in a.env:
        k, v = pair.split("=", 1)
        env[k] = v

    import redis

    redis.from_url(env["REDIS_URL"]).flushdb()
    py = sys.executable
    procs = []

    def run(*args, **kw):
        return subprocess.run([py, *args], cwd=BACKEND, env=env, capture_output=True, encoding="utf-8", errors="replace", **kw)

    code = 1
    try:
        r = run("scripts/db_bootstrap.py")
        print("bootstrap:", (r.stdout.strip().splitlines() or ["?"])[-1], flush=True)
        if r.returncode:
            print(r.stdout[-2000:], r.stderr[-2000:])
            return 1
        if not a.no_seed:
            run("-m", "scripts.seed")
        urls, pids = [], []
        for i in range(a.apis):
            port = a.port + i
            p = subprocess.Popen([py, "-m", "uvicorn", "app.main:app", "--port", str(port), "--log-level", "warning"],
                                 cwd=BACKEND, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            procs.append(p)
            urls.append(f"http://127.0.0.1:{port}")
            pids.append(str(p.pid))
        if a.worker:
            log = open(BACKEND / "worker_check.log", "w", encoding="utf-8")
            procs.append(subprocess.Popen(
                [py, "-m", "celery", "-A", "app.core.celery_app:celery_app", "worker", "--pool=solo", "--loglevel=info",
                 "-Q", "optimizer,default,booking_queue,event_queue,notification_queue", "--hostname", "worker-all@stack"],
                cwd=BACKEND, env=env, stdout=log, stderr=subprocess.STDOUT))
        if a.scheduler:
            procs.append(subprocess.Popen([py, "-m", "app.scheduler"], cwd=BACKEND, env=env,
                                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
        for u in urls:
            _wait_http(u + "/health/live")
        if a.worker:
            import requests

            end = time.time() + 60
            while time.time() < end and requests.get(urls[0] + "/health/ready", timeout=10).json().get("celery") != "connected":
                time.sleep(1)
        env["STACK_API_URLS"], env["STACK_API_PIDS"] = ",".join(urls), ",".join(pids)
        r = run(a.script, urls[0], *a.script_args, timeout=1800)
        print(r.stdout[-8000:], flush=True)
        if r.returncode:
            print("STDERR:", r.stderr[-3000:])
        code = r.returncode
    finally:
        for p in procs:
            if p.poll() is None:
                p.terminate()
        time.sleep(1)
        try:
            con = _admin(server)
            con.cursor().execute(f'DROP DATABASE IF EXISTS "{db}" WITH (FORCE)')
            con.close()
        except Exception as e:
            print("Could not drop the scratch database:", e)
    return code


if __name__ == "__main__":
    sys.exit(main())
