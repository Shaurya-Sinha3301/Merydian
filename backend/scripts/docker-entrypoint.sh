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
        echo "🔄  Bootstrapping schema …"
        python scripts/db_bootstrap.py
        echo "✅  Schema ready."
        ;;

    # ── Start FastAPI application ─────────────────────────────────────────────
    api)
        wait_for_postgres
        wait_for_redis
        echo "🚀  Starting FastAPI (uvicorn) …"
        exec uvicorn app.main:app \
            --host 0.0.0.0 \
            --port "${PORT:-8000}" \
            --workers "${UVICORN_WORKERS:-2}" \
            --log-level "${LOG_LEVEL:-info}"
        ;;

    # ── Start Celery worker (handles: booking jobs, agent tasks, events) ──────
    worker)
        wait_for_postgres
        wait_for_redis
        echo "⚙️   Starting Celery worker …"
        exec celery -A app.core.celery_app:celery_app worker \
            --loglevel="${LOG_LEVEL:-info}" \
            --concurrency="${CELERY_CONCURRENCY:-4}" \
            --queues="${CELERY_QUEUES:-default,booking_queue,event_queue,notification_queue}" \
            --hostname="worker@%h"
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
            --queues="${CELERY_QUEUES:-default,booking_queue,event_queue,notification_queue}" \
            --hostname="worker@%h" &
        WORKER_PID=$!
        trap 'kill "$WORKER_PID" 2>/dev/null || true' EXIT TERM INT
        echo "🚀  Starting FastAPI (uvicorn) on port ${PORT:-8000} …"
        uvicorn app.main:app \
            --host 0.0.0.0 \
            --port "${PORT:-8000}" \
            --workers 1 \
            --proxy-headers --forwarded-allow-ips="*" \
            --log-level "${LOG_LEVEL:-info}"
        ;;

    # ── Start Celery Beat scheduler ───────────────────────────────────────────
    beat)
        wait_for_redis
        echo "🕐  Starting Celery Beat scheduler …"
        exec celery -A app.core.celery_app:celery_app beat \
            --loglevel="${LOG_LEVEL:-info}"
        ;;

    # ── Flower monitoring dashboard ───────────────────────────────────────────
    flower)
        wait_for_redis
        echo "🌸  Starting Flower monitoring …"
        exec celery -A app.core.celery_app:celery_app flower \
            --port=5555 \
            --address=0.0.0.0 \
            --basic_auth="${FLOWER_USER:-admin}:${FLOWER_PASSWORD:-admin}" \
            --loglevel="${LOG_LEVEL:-info}"
        ;;

    *)
        echo "❌  Unknown mode: ${MODE}"
        echo "    Valid modes: api | worker | all | beat | flower | migrate"
        exit 1
        ;;
esac
