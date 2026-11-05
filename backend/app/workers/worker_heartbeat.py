"""
Each worker announces that it is alive, which queues it serves, and since when.

Every WORKER_HEARTBEAT_SECONDS a worker writes `worker:heartbeat:<name>` on the queue Redis with a lifetime
of three beats, so a worker that dies simply disappears after a minute or so. The API's readiness check reads
these keys: "the site is up" then also means "plans will be built". A worker that shuts down cleanly removes
its key at once.
"""
import json
import logging
import os
import threading
import time
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

PREFIX = "worker:heartbeat:"
_stop = threading.Event()
_name: Optional[str] = None


def interval() -> float:
    return float(os.getenv("WORKER_HEARTBEAT_SECONDS", "20"))


def _client():
    import redis

    from app.core.redis import queue_url

    return redis.from_url(queue_url(), decode_responses=True, socket_connect_timeout=2, socket_timeout=2)


def _llm_status() -> str:
    """Whether this process holds a usable language-model key. Only the optimizer worker needs one, so the API
    reads this from the workers' heartbeats instead of holding the key itself."""
    from app.core.config import settings

    key = os.environ.get("GROQ_API_KEY") or getattr(settings, "GROQ_API_KEY", "") or ""
    if not key:
        return "missing_api_key"
    if any(marker in key.lower() for marker in ("your", "here", "xxx", "placeholder")):
        return "placeholder_api_key"
    return "configured"


def start(name: str, queues: List[str]) -> None:
    global _name
    _name = name
    started = time.time()

    def beat() -> None:
        r = _client()
        while not _stop.is_set():
            try:
                r.set(PREFIX + name, json.dumps({"name": name, "queues": queues, "pid": os.getpid(),
                                                 "started": started, "at": time.time(), "llm": _llm_status()}),
                      ex=int(interval() * 3))
            except Exception as exc:
                logger.warning("Worker heartbeat not written: %s", exc)
            _stop.wait(interval())

    threading.Thread(target=beat, name="worker-heartbeat", daemon=True).start()
    logger.info("Worker heartbeat started for %s on %s", name, ",".join(queues))


def stop() -> None:
    _stop.set()
    if _name:
        try:
            _client().delete(PREFIX + _name)
        except Exception:
            pass


def alive() -> List[Dict[str, Any]]:
    """Every worker that has reported in recently, with the age of its last beat in seconds."""
    r = _client()
    now = time.time()
    out = []
    for key in r.scan_iter(PREFIX + "*"):
        raw = r.get(key)
        if not raw:
            continue
        info = json.loads(raw)
        info["age_seconds"] = round(now - info.get("at", now), 1)
        out.append(info)
    return sorted(out, key=lambda w: w["name"])
