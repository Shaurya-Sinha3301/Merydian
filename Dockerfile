# Merydian backend, two images from one file. Build context is the repo root.
#
#   target "api"     the web API only: no solver, no language-model client, no agents. It cannot run a solve
#                    even by accident, starts faster and is smaller.
#   target "worker"  (the default, last stage) everything: the API code plus the solver, the model clients,
#                    the agents and the reference data. Runs the workers, and the single-container showcase
#                    mode ("all") that Render uses.

FROM python:3.15-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies first so the layer is cached across code changes
COPY backend/requirements/ /tmp/requirements/
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /tmp/requirements/api.txt

COPY backend/scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

# backend imports `app.*`; the worker image also imports `agents.*` and `ml_or.*`
ENV PYTHONPATH=/app/backend:/app \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ML_OPTIMIZER_BASE_DATA=/app/ml_or/data

RUN groupadd --gid 1001 appgroup \
    && useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

# Render injects $PORT; default for local runs
ENV PORT=8000
EXPOSE 8000
ENTRYPOINT ["docker-entrypoint.sh"]


# ── The API image ───────────────────────────────────────────────────────────────────────────────
FROM base AS api
# Source (secrets are injected as environment variables, never copied in)
COPY backend/ ./backend/
# Read-only reference data (the list of places a traveller can ask for). Data only: no solver code.
COPY ml_or/data/ ./ml_or/data/
RUN chown -R appuser:appgroup /app
USER appuser
CMD ["api"]


# ── The worker image (default target) ──────────────────────────────────────────────────────────
FROM base AS worker
COPY agents/requirements_agents.txt /tmp/requirements_agents.txt
RUN pip install --no-cache-dir -r /tmp/requirements/worker.txt -r /tmp/requirements_agents.txt
COPY backend/ ./backend/
COPY agents/  ./agents/
COPY ml_or/   ./ml_or/
RUN chown -R appuser:appgroup /app
USER appuser
CMD ["all"]
