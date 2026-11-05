#!/usr/bin/env bash
# =============================================================================
# docker-entrypoint.sh
#
# Single entrypoint for all Merydian backend service modes.
# Usage: set CMD to one of: api | worker | worker-optimizer | worker-default | scheduler | all | migrate
# =============================================================================
set -euo pipefail

MODE="${1:-api}"

# Change to backend dir so relative paths (alembic.ini etc.) resolve correctly
cd /app/backend

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  MeiliAI Backend — starting in mode: ${MODE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Wait for Postgres ─────────────────────────────────────────────────────────
wait_for_postgres() {
    echo "⏳  Waiting for PostgreSQL …"
    local tries=0
    until python -c "
import psycopg2, os, sys
uri = os.environ.get('SQLALCHEMY_DATABASE_URI', '')
if not uri:
    print('   SQLALCHEMY_DATABASE_URI is empty'); sys.exit(1)
uri = uri.strip().strip('\"').strip(\"'\")
uri = uri.replace('postgresql+psycopg2://', 'postgresql://', 1)
try:
    psycopg2.connect(uri, connect_timeout=10).close()
except Exception as e:
    print('   ' + type(e).__name__ + ': ' + str(e).strip().splitlines()[0])
    sys.exit(1)
"; do
        tries=$((tries + 1))
        if [ "$tries" -ge 30 ]; then
            echo "❌  PostgreSQL did not become reachable. Check SQLALCHEMY_DATABASE_URI."
            exit 1
        fi
        echo "   … not ready yet (attempt ${tries}/30), retrying in 2s"
        sleep 2
    done
    echo "✅  PostgreSQL is ready."
}

# ── Wait for Redis ────────────────────────────────────────────────────────────
wait_for_redis() {
    echo "⏳  Waiting for the queue Redis …"
    until python -c "
import redis, os, sys
try:
    r = redis.from_url(os.environ.get('CELERY_BROKER_URL') or os.environ.get('REDIS_QUEUE_URL') or os.environ.get('REDIS_URL') or 'redis://redis:6379/0')
    r.ping()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
        echo "   … not ready yet, retrying in 2s"
        sleep 2
    done
    echo "✅  Redis is ready."
}

# ── Wait until the database is at the schema this code expects ───────────────
# Services that do not migrate must not start against an older schema.
wait_for_schema() {
    echo "⏳  Waiting for the database schema …"
    python scripts/wait_for_schema.py "${SCHEMA_WAIT_SECONDS:-300}" || exit 1
}

case "$MODE" in

    # ── Run Alembic migrations then exit (used as init-container) ────────────
    migrate)
        wait_for_postgres
        echo "🔄  Bootstrapping schema …"
        python scripts/db_bootstrap.py
        echo "✅  Schema ready."
        if [ "${SEED_ON_START:-false}" = "true" ]; then
            echo "🌱  Seeding data …"
            python -m scripts.seed || echo "⚠️  Seeding failed (continuing)"
        fi
        ;;

    # ── Start FastAPI application ─────────────────────────────────────────────
    api)
        wait_for_postgres
        wait_for_schema
        wait_for_redis
        echo "🚀  Starting FastAPI (uvicorn) …"
        exec uvicorn app.main:app \
            --host 0.0.0.0 \
            --port "${PORT:-8000}" \
            --workers "${UVICORN_WORKERS:-2}" \
            --log-level "${LOG_LEVEL:-info}"
        ;;

    # ── Celery workers ─────────────────────────────────────────────────────────
    #   worker-optimizer  solver and language-model jobs only; one job per core by default
    #   worker-default    outbox dispatch, email, SMS, webhooks, events, bookings
    #   worker            any queues you name in CELERY_QUEUES (default: all of them)
    worker|worker-optimizer|worker-default)
        wait_for_postgres
        wait_for_schema
        wait_for_redis
        case "$MODE" in
            worker-optimizer)
                QUEUES="optimizer"; CONCURRENCY="${CELERY_CONCURRENCY:-1}"
                export OUTBOX_DISPATCHER=false ;;
            worker-default)
                QUEUES="default,booking_queue,event_queue,notification_queue"; CONCURRENCY="${CELERY_CONCURRENCY:-4}" ;;
            *)
                QUEUES="${CELERY_QUEUES:-optimizer,default,booking_queue,event_queue,notification_queue}"; CONCURRENCY="${CELERY_CONCURRENCY:-2}" ;;
        esac
        echo "Starting Celery ${MODE} on queues ${QUEUES} ..."
        # On SIGTERM Celery finishes the running job (or hands it back: tasks are acknowledged late)
        exec celery -A app.core.celery_app:celery_app worker             --loglevel="${LOG_LEVEL:-info}"             --concurrency="${CONCURRENCY}"             --prefetch-multiplier=1             --max-tasks-per-child=50             --queues="${QUEUES}"             --hostname="${MODE}@%h"
        ;;

    # ── Single-container mode for free hosts (Render): migrate, worker + API ──
    all)
        wait_for_postgres
        wait_for_redis
        echo "🔄  Bootstrapping schema …"
        python scripts/db_bootstrap.py
        if [ "${SEED_ON_START:-false}" = "true" ]; then
            echo "🌱  Seeding data …"
            python -m scripts.seed || echo "⚠️  Seeding failed (continuing)"
        fi
        echo "⚙️   Starting Celery worker in background …"
        celery -A app.core.celery_app:celery_app worker \
            --loglevel="${LOG_LEVEL:-info}" \
            --concurrency="${CELERY_CONCURRENCY:-1}" \
            --max-tasks-per-child=20 \
            --queues="${CELERY_QUEUES:-optimizer,default,booking_queue,event_queue,notification_queue}" \
            --hostname="worker@%h" &
        WORKER_PID=$!
        echo "Starting the scheduler in background ..."
        python -m app.scheduler &
        SCHEDULER_PID=$!
        trap 'kill "$WORKER_PID" "$SCHEDULER_PID" 2>/dev/null || true' EXIT TERM INT
        echo "🚀  Starting FastAPI (uvicorn) on port ${PORT:-8000} …"
        uvicorn app.main:app \
            --host 0.0.0.0 \
            --port "${PORT:-8000}" \
            --workers 1 \
            --proxy-headers --forwarded-allow-ips="*" \
            --log-level "${LOG_LEVEL:-info}"
        ;;

    # ── Scheduler: one process that sweeps for stuck work (app/scheduler.py) ──────
    scheduler)
        wait_for_postgres
        wait_for_schema
        wait_for_redis
        echo "Starting the scheduler ..."
        exec python -m app.scheduler
        ;;

    *)
        echo "❌  Unknown mode: ${MODE}"
        echo "    Valid modes: api | worker | worker-optimizer | worker-default | scheduler | all | migrate"
        exit 1
        ;;
esac
