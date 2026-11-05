"""
Operational views: Prometheus metrics, error groups and a small dashboard.

Every number is read from shared state (the queue Redis, the job and outbox tables, the worker heartbeats),
not from counters inside one process, so any API copy reports the same thing. Open in showcase mode; in
production they need `Authorization: Bearer <METRICS_TOKEN>`, and are hidden (404) if no token is set.
"""
import html
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import HTMLResponse, PlainTextResponse
from sqlalchemy import func, select
from sqlmodel import Session

from app.core.config import settings
from app.core.db import engine
from app.models.agent_job import AgentJob, AgentJobEvent, JobStatus
from app.models.error_group import ErrorGroup
from app.models.outbox import OutboxMessage

router = APIRouter()
QUEUES = ("optimizer", "default", "booking_queue", "event_queue", "notification_queue")


def _allowed(authorization: Optional[str]) -> None:
    token = (settings.METRICS_TOKEN or "").strip()
    if token and authorization == f"Bearer {token}":
        return
    if settings.showcase and not token:
        return
    raise HTTPException(status_code=404, detail="Not Found")


def _percentile(values: List[float], q: float) -> float:
    if not values:
        return 0.0
    values = sorted(values)
    return values[min(len(values) - 1, int(q * (len(values) - 1) + 0.5))]


def collect() -> List[Tuple[str, str, Dict[str, str], float]]:
    """(name, help, labels, value) for every metric."""
    out: List[Tuple[str, str, Dict[str, str], float]] = []
    now = datetime.utcnow()

    try:
        import redis

        from app.core.redis import queue_url

        r = redis.from_url(queue_url(), socket_connect_timeout=2, socket_timeout=2)
        for q in QUEUES:
            out.append(("merydian_queue_length", "Messages waiting in each Celery queue", {"queue": q}, float(r.llen(q))))
    except Exception:
        pass

    try:
        from app.workers import worker_heartbeat

        workers = worker_heartbeat.alive()
        for q in QUEUES:
            out.append(("merydian_workers_alive", "Workers with a fresh heartbeat serving each queue", {"queue": q},
                        float(sum(1 for w in workers if q in (w.get("queues") or [])))))
    except Exception:
        pass

    with Session(engine) as s:
        for status, jtype, n in s.execute(select(AgentJob.status, AgentJob.job_type, func.count()).group_by(AgentJob.status, AgentJob.job_type)):
            out.append(("merydian_jobs", "Background jobs by status and type", {"status": status.value, "type": jtype.value}, float(n)))
        hour = now - timedelta(hours=1)
        failed = s.execute(select(func.count()).select_from(AgentJob).where(AgentJob.status == JobStatus.FAILED, AgentJob.updated_at >= hour)).scalar()
        out.append(("merydian_jobs_failed_last_hour", "Jobs that failed in the last hour", {}, float(failed)))
        expired = s.execute(select(func.count()).select_from(AgentJob).where(AgentJob.error_type.in_(["JobAbandoned", "JobLost", "WaitDeadline"]),
                                                                              AgentJob.updated_at >= hour)).scalar()
        out.append(("merydian_jobs_expired_last_hour", "Jobs ended by the scheduler or a deadline in the last hour", {}, float(expired)))
        # A claim with a fence above 1 means an earlier owner held the job and stopped renewing
        takeovers = s.execute(select(func.count()).select_from(AgentJobEvent).where(
            AgentJobEvent.event_type == "JOB_STARTED", AgentJobEvent.event_payload["fence"].astext.notin_(["0", "1"]))).scalar()
        out.append(("merydian_lease_takeovers_total", "Times a job was taken over after its owner stopped renewing", {}, float(takeovers)))
        republished = s.execute(select(func.count()).select_from(AgentJobEvent).where(AgentJobEvent.event_type == "JOB_REPUBLISHED")).scalar()
        out.append(("merydian_jobs_republished_total", "Times the scheduler re-published a lost job", {}, float(republished)))
        for jtype in ("AGENT_FEEDBACK", "TRIP_INIT", "POI_PROPOSAL"):
            durations = [(c - st).total_seconds() for st, c in s.execute(select(AgentJob.started_at, AgentJob.completed_at).where(
                AgentJob.status == JobStatus.COMPLETED, AgentJob.job_type == jtype, AgentJob.completed_at >= hour,
                AgentJob.started_at.is_not(None)))]
            for q in (0.5, 0.95):
                out.append(("merydian_job_duration_seconds", "Run time of jobs completed in the last hour", {"type": jtype, "quantile": str(q)},
                            round(_percentile(durations, q), 3)))
        counts = dict(s.execute(select(OutboxMessage.status, func.count()).group_by(OutboxMessage.status)).all())
        for st in ("pending", "in_progress", "sent", "dead"):  # always present, so an empty outbox still graphs
            out.append(("merydian_outbox", "Outbox rows by status", {"status": st}, float(counts.get(st, 0))))
        oldest = s.execute(select(func.min(OutboxMessage.created_at)).where(OutboxMessage.status.in_(["pending", "in_progress"]))).scalar()
        out.append(("merydian_outbox_oldest_pending_seconds", "Age of the oldest undelivered outbox row", {},
                    round((now - oldest).total_seconds(), 1) if oldest else 0.0))
        errors = s.execute(select(func.coalesce(func.sum(ErrorGroup.count), 0)).where(ErrorGroup.last_seen >= hour)).scalar()
        out.append(("merydian_errors_last_hour", "Unhandled errors in groups seen in the last hour", {}, float(errors)))

    from app.services import plan_cache

    for source in ("cache", "cache_after_wait", "postgres", "postgres_cache_down", "not_modified"):
        out.append(("merydian_plan_reads_total", "Current-plan reads in this process, by where the answer came from",
                    {"source": source}, float(plan_cache.reads.get(source, 0))))

    pool = engine.pool
    for name, fn in (("size", "size"), ("checked_out", "checkedout"), ("overflow", "overflow")):
        try:
            out.append(("merydian_db_pool", "This process's database connection pool", {"state": name}, float(getattr(pool, fn)())))
        except Exception:
            pass
    return out


def _prometheus(rows) -> str:
    lines, seen = [], set()
    for name, help_text, labels, value in rows:
        if name not in seen:
            lines += [f"# HELP {name} {help_text}", f"# TYPE {name} gauge"]
            seen.add(name)
        label = ",".join(f'{k}="{v}"' for k, v in labels.items())
        lines.append(f"{name}{{{label}}} {value}" if label else f"{name} {value}")
    return "\n".join(lines) + "\n"


@router.get("/metrics", response_class=PlainTextResponse, include_in_schema=False)
def metrics(authorization: Optional[str] = Header(default=None)):
    _allowed(authorization)
    return PlainTextResponse(_prometheus(collect()), media_type="text/plain; version=0.0.4")


@router.get("/ops/errors", include_in_schema=False)
def error_groups(authorization: Optional[str] = Header(default=None), limit: int = 50):
    _allowed(authorization)
    with Session(engine) as s:
        rows = s.execute(select(ErrorGroup).order_by(ErrorGroup.last_seen.desc()).limit(min(limit, 200))).scalars().all()
        return [{"fingerprint": e.fingerprint, "type": e.type, "message": e.message, "location": e.location, "count": e.count,
                 "first_seen": e.first_seen.isoformat(), "last_seen": e.last_seen.isoformat(),
                 "last_request_id": e.last_request_id, "last_where": e.last_where} for e in rows]


@router.get("/ops", response_class=HTMLResponse, include_in_schema=False)
def dashboard(authorization: Optional[str] = Header(default=None)):
    _allowed(authorization)
    rows = collect()
    groups = error_groups(authorization)
    metric_rows = "".join(
        f"<tr><td>{html.escape(n)}</td><td>{html.escape(', '.join(f'{k}={v}' for k, v in l.items()))}</td><td class=n>{v:g}</td></tr>"
        for n, _h, l, v in rows)
    error_rows = "".join(
        f"<tr><td>{html.escape(g['type'])}</td><td>{html.escape(g['location'])}</td><td class=n>{g['count']}</td>"
        f"<td>{html.escape(g['last_seen'][:19])}</td><td>{html.escape(g['last_request_id'])}</td></tr>" for g in groups) or \
        "<tr><td colspan=5>No unhandled errors recorded.</td></tr>"
    return f"""<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>Merydian operations</title>
<style>body{{font:14px system-ui,sans-serif;margin:24px;color:#111}}table{{border-collapse:collapse;width:100%;margin-bottom:28px}}
td,th{{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}}.n{{text-align:right;font-variant-numeric:tabular-nums}}
h1{{font-size:20px}}h2{{font-size:15px;margin-top:24px}}</style></head><body>
<h1>Merydian operations</h1><p>Read from shared state; any API copy shows the same numbers. Raw form: <code>/metrics</code>.</p>
<h2>Metrics</h2><table><tr><th>Metric</th><th>Labels</th><th class=n>Value</th></tr>{metric_rows}</table>
<h2>Error groups</h2><table><tr><th>Type</th><th>Where</th><th class=n>Count</th><th>Last seen (UTC)</th><th>Last request</th></tr>{error_rows}</table>
</body></html>"""
