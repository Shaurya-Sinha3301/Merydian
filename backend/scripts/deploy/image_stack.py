"""
Run the split architecture from the built images (API image, optimizer worker, default worker) against a
scratch database, run queues_check.py against it, and tear it down.

Needs the images: docker build --target api -t merydian-api:local . && docker build --target worker -t merydian-worker:local .
Postgres and Redis must be reachable from containers at host.docker.internal (Docker Desktop provides this).
Run from backend/:  python scripts/deploy/image_stack.py [--api-image ...] [--worker-image ...]
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
sys.path.insert(0, str(Path(__file__).resolve().parent))
from stack import _admin, _dotenv, _wait_http  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--api-image", default="merydian-api:local")
    ap.add_argument("--worker-image", default="merydian-worker:local")
    ap.add_argument("--port", type=int, default=8017)
    ap.add_argument("--redis-db", type=int, default=11)
    a = ap.parse_args()

    dot = _dotenv()
    server = (os.environ.get("SQLALCHEMY_DATABASE_URI") or dot["SQLALCHEMY_DATABASE_URI"]).replace("postgresql+psycopg2://", "postgresql://")
    parts = urlsplit(server)
    db = f"images_{uuid.uuid4().hex[:8]}"
    con = _admin(server)
    con.cursor().execute(f'CREATE DATABASE "{db}"')
    con.close()
    inside = urlunsplit(parts._replace(netloc=parts.netloc.replace("localhost", "host.docker.internal").replace("127.0.0.1", "host.docker.internal"),
                                       path="/" + db))
    redis_host = f"redis://host.docker.internal:6379/{a.redis_db}"
    common = {"SQLALCHEMY_DATABASE_URI": inside, "SECRET_KEY": "images-" + "k" * 30, "REDIS_URL": redis_host,
              "REDIS_QUEUE_URL": redis_host, "REDIS_EPHEMERAL_URL": f"redis://host.docker.internal:6379/{a.redis_db + 1}",
              "CELERY_BROKER_URL": "", "APP_MODE": "showcase", "DEMO_ENABLED": "true", "SEED_ON_START": "true",
              "GROQ_MODEL": "openai/gpt-oss-20b", "WORKER_HEARTBEAT_SECONDS": "3", "AGENT_SIGNUP_CODE": "images",
              "BACKEND_CORS_ORIGINS": '["http://localhost:5173"]'}
    names = {k: f"images-{k}-{db[-4:]}" for k in ("migrate", "api", "opt", "def")}

    def run(name, image, mode, extra=None, port=None, detach=True):
        args = ["docker", "run", "--name", name] + (["-d"] if detach else []) + (["-p", f"{port}:8000"] if port else [])
        for k, v in dict(common, **(extra or {})).items():
            args += ["-e", f"{k}={v}"]
        return subprocess.run(args + [image, mode], capture_output=True, encoding="utf-8", errors="replace")

    import redis

    redis.from_url(f"redis://127.0.0.1:6379/{a.redis_db}").flushdb()
    code = 1
    try:
        m = run(names["migrate"], a.api_image, "migrate", detach=False)
        print("migrate (API image):", m.returncode, (m.stdout.strip().splitlines() or ["?"])[-1][:120], flush=True)
        run(names["api"], a.api_image, "api", port=a.port)
        run(names["opt"], a.worker_image, "worker-optimizer",
            {"GROQ_API_KEY": os.environ.get("GROQ_API_KEY") or dot.get("GROQ_API_KEY", "")})
        run(names["def"], a.worker_image, "worker-default")
        _wait_http(f"http://127.0.0.1:{a.port}/health/live", 180)
        env = dict(os.environ, SQLALCHEMY_DATABASE_URI=urlunsplit(parts._replace(path="/" + db)),
                   REDIS_URL=f"redis://127.0.0.1:6379/{a.redis_db}", REDIS_QUEUE_URL=f"redis://127.0.0.1:6379/{a.redis_db}",
                   REDIS_EPHEMERAL_URL=f"redis://127.0.0.1:6379/{a.redis_db + 1}", CELERY_BROKER_URL="", SECRET_KEY="x" * 32,
                   PYTHONPATH=os.pathsep.join([str(BACKEND), str(REPO)]), PYTHONIOENCODING="utf-8")
        r = subprocess.run([sys.executable, "scripts/deploy/queues_check.py", f"http://127.0.0.1:{a.port}",
                            names["api"], names["opt"], names["def"]],
                           cwd=BACKEND, env=env, capture_output=True, encoding="utf-8", errors="replace", timeout=1500)
        print(r.stdout[-6000:], flush=True)
        if r.returncode:
            print("STDERR:", r.stderr[-2000:])
        code = r.returncode
    finally:
        for n in names.values():
            subprocess.run(["docker", "rm", "-f", n], capture_output=True)
        time.sleep(1)
        con = _admin(server)
        con.cursor().execute(f'DROP DATABASE IF EXISTS "{db}" WITH (FORCE)')
        con.close()
    return code


if __name__ == "__main__":
    sys.exit(main())
