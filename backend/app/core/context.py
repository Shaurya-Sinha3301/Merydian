import contextvars
from typing import Optional

# Standard structured logging fields
correlation_id_ctx = contextvars.ContextVar("correlation_id", default=None)
request_id_ctx = contextvars.ContextVar("request_id", default=None)
user_id_ctx = contextvars.ContextVar("user_id", default=None)
family_id_ctx = contextvars.ContextVar("family_id", default=None)
trip_id_ctx = contextvars.ContextVar("trip_id", default=None)
itinerary_id_ctx = contextvars.ContextVar("itinerary_id", default=None)
agent_job_id_ctx = contextvars.ContextVar("agent_job_id", default=None)
optimization_iteration_ctx = contextvars.ContextVar("optimization_iteration", default=None)
event_type_ctx = contextvars.ContextVar("event_type", default=None)

def set_log_context(**kwargs):
    """Convenience function to set multiple context variables at once."""
    if "correlation_id" in kwargs:
        correlation_id_ctx.set(kwargs["correlation_id"])
    if "request_id" in kwargs:
        request_id_ctx.set(kwargs["request_id"])
    if "user_id" in kwargs:
        user_id_ctx.set(kwargs["user_id"])
    if "family_id" in kwargs:
        family_id_ctx.set(kwargs["family_id"])
    if "trip_id" in kwargs:
        trip_id_ctx.set(kwargs["trip_id"])
    if "itinerary_id" in kwargs:
        itinerary_id_ctx.set(kwargs["itinerary_id"])
    if "agent_job_id" in kwargs:
        agent_job_id_ctx.set(kwargs["agent_job_id"])
    if "optimization_iteration" in kwargs:
        optimization_iteration_ctx.set(kwargs["optimization_iteration"])
    if "event_type" in kwargs:
        event_type_ctx.set(kwargs["event_type"])

def get_log_context() -> dict:
    """Return the current context as a dictionary."""
    return {
        "correlation_id": correlation_id_ctx.get(),
        "request_id": request_id_ctx.get(),
        "user_id": user_id_ctx.get(),
        "family_id": family_id_ctx.get(),
        "trip_id": trip_id_ctx.get(),
        "itinerary_id": itinerary_id_ctx.get(),
        "agent_job_id": agent_job_id_ctx.get(),
        "optimization_iteration": optimization_iteration_ctx.get(),
        "event_type": event_type_ctx.get(),
    }

def clear_log_context():
    """Clear all logging context."""
    correlation_id_ctx.set(None)
    request_id_ctx.set(None)
    user_id_ctx.set(None)
    family_id_ctx.set(None)
    trip_id_ctx.set(None)
    itinerary_id_ctx.set(None)
    agent_job_id_ctx.set(None)
    optimization_iteration_ctx.set(None)
    event_type_ctx.set(None)
