# MeiliAI backend: FastAPI + Celery + agents + ML optimizer.
# Build context is the repo root (backend/, agents/, ml_or/ are all needed).
FROM python:3.11-slim

LABEL description="MeiliAI Backend - FastAPI + Celery + AI Agents"

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies first so the layer is cached across code changes
COPY backend/requirements/ /tmp/requirements/
COPY agents/requirements_agents.txt /tmp/requirements_agents.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir \
        -r /tmp/requirements/api.txt \
        -r /tmp/requirements/worker.txt \
        -r /tmp/requirements_agents.txt

# Source (secrets are injected as environment variables, never copied in)
COPY backend/ ./backend/
COPY agents/  ./agents/
COPY ml_or/   ./ml_or/

COPY backend/scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

# backend imports `app.*`, `agents.*` and `ml_or.*`
ENV PYTHONPATH=/app/backend:/app \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ML_OPTIMIZER_BASE_DATA=/app/ml_or/data \
    TRIP_SESSION_STORAGE=/app/backend/trip_sessions \
    OPTIMIZER_OUTPUT_DIR=/app/backend/optimizer_outputs

RUN groupadd --gid 1001 appgroup \
    && useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser \
    && mkdir -p /app/backend/trip_sessions /app/backend/optimizer_outputs \
    && chown -R appuser:appgroup /app

USER appuser

# Render injects $PORT; default for local runs
ENV PORT=8000
EXPOSE 8000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["all"]
