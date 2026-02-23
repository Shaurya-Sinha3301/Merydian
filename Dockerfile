# ── Stage 1: Builder (compile deps into wheels) ─────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install backend deps
COPY backend/requirements.txt backend-requirements.txt
# Install agent deps  
COPY agents/requirements_agents.txt agents-requirements.txt

RUN pip install --upgrade pip \
    && pip wheel --no-cache-dir --wheel-dir /wheels \
    -r backend-requirements.txt \
    -r agents-requirements.txt \
    python-dotenv alembic


# ── Stage 2: Runtime image ───────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

LABEL maintainer="MeiliAI Team"
LABEL description="MeiliAI Backend — FastAPI + Celery + AI Agents"

# Runtime system libraries only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security
RUN groupadd --gid 1001 appgroup \
    && useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

WORKDIR /app

# Install pre-built wheels
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links /wheels /wheels/*.whl \
    && rm -rf /wheels

# Copy all source code
# The working directory is the repo root, so all of:
#   backend/   agents/   ml_or/  are copied
COPY backend/  ./backend/
COPY agents/   ./agents/
COPY ml_or/    ./ml_or/
COPY .env      .env

# Entrypoint script
COPY backend/scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# For the backend service (FastAPI) add backend to PYTHONPATH
# so `from app.xxx import ...` works.  Agents dir also needs to be on path
# because backend imports from `agents.agent_controller` etc.
ENV PYTHONPATH=/app/backend:/app \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Directories for optimizer outputs / sessions (mapped to volumes)
RUN mkdir -p /app/backend/trip_sessions \
    /app/backend/optimizer_outputs \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["api"]
