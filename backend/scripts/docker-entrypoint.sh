#!/usr/bin/env bash
# =============================================================================
# docker-entrypoint.sh
#
# Single entrypoint for all MeiliAI backend service modes.
# Usage: set CMD to one of: api | worker | beat | flower | migrate
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
    echo "⏳  Waiting for PostgreSQL at ${DB_HOST:-db}:${DB_PORT:-5432} …"
    until python -c "
import psycopg2, os, sys
try:
    conn = psycopg2.connect(os.environ['SQLALCHEMY_DATABASE_URI'])
    conn.close()
    sys.exit(0)
except Exception as e:
    sys.exit(1)
" 2>/dev/null; do
        echo "   … not ready yet, retrying in 2s"
        sleep 2
    done
    echo "✅  PostgreSQL is ready."
}

# ── Wait for Redis ────────────────────────────────────────────────────────────
wait_for_redis() {
    echo "⏳  Waiting for Redis at $CELERY_BROKER_URL …"
    until python -c "
import redis, os, sys
try:
    r = redis.from_url(os.environ.get('CELERY_BROKER_URL', 'redis://redis:6379/0'))
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

case "$MODE" in

    # ── Run Alembic migrations then exit (used as init-container) ────────────
    migrate)
        wait_for_postgres
        echo "🔄  Running Alembic migrations …"
        alembic upgrade head
        echo "✅  Migrations complete."
        ;;

    # ── Start FastAPI application ─────────────────────────────────────────────
    api)
        wait_for_postgres
        wait_for_redis
        echo "🚀  Starting FastAPI (uvicorn) …"
        exec uvicorn app.main:app \
            --host 0.0.0.0 \
            --port 8000 \
            --workers "${UVICORN_WORKERS:-2}" \
            --loop uvloop \
            --log-level "${LOG_LEVEL:-info}"
        ;;

    # ── Start Celery worker (handles: booking jobs, agent tasks, events) ──────
    worker)
        wait_for_postgres
        wait_for_redis
        echo "⚙️   Starting Celery worker …"
        exec celery -A app.worker.celery worker \
            --loglevel="${LOG_LEVEL:-info}" \
            --concurrency="${CELERY_CONCURRENCY:-4}" \
            --queues="default,bookings,agent_tasks" \
            --hostname="worker@%h"
        ;;

    # ── Start Celery Beat scheduler ───────────────────────────────────────────
    beat)
        wait_for_redis
        echo "🕐  Starting Celery Beat scheduler …"
        exec celery -A app.worker.celery beat \
            --loglevel="${LOG_LEVEL:-info}" \
            --scheduler django_celery_beat.schedulers:DatabaseScheduler 2>/dev/null \
            || exec celery -A app.worker.celery beat \
                --loglevel="${LOG_LEVEL:-info}"
        ;;

    # ── Flower monitoring dashboard ───────────────────────────────────────────
    flower)
        wait_for_redis
        echo "🌸  Starting Flower monitoring …"
        exec celery -A app.worker.celery flower \
            --port=5555 \
            --address=0.0.0.0 \
            --basic_auth="${FLOWER_USER:-admin}:${FLOWER_PASSWORD:-admin}" \
            --loglevel="${LOG_LEVEL:-info}"
        ;;

    *)
        echo "❌  Unknown mode: ${MODE}"
        echo "    Valid modes: api | worker | beat | flower | migrate"
        exit 1
        ;;
esac
