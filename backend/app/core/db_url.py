"""
Helpers for turning a configured database address into the one a given job should use.

Two addresses can reach the same Postgres: a pooled one (many short connections share a few real ones,
used by the API and workers) and a direct one (one real connection each, needed by migrations because a
session-level lock does not survive transaction-mode pooling).
"""
from typing import Optional
from urllib.parse import urlsplit, urlunsplit


def normalize(uri: str) -> str:
    """Strip stray quotes, accept the legacy "postgres://" scheme, and name the driver explicitly."""
    uri = uri.strip().strip("\"'")
    if uri.startswith("postgres://"):
        uri = "postgresql://" + uri[len("postgres://"):]
    if uri.startswith("postgresql://"):
        uri = "postgresql+psycopg2://" + uri[len("postgresql://"):]
    return uri


def direct_from_pooled(uri: str) -> Optional[str]:
    """Neon's pooled hostname is the direct hostname with "-pooler" added to its first label.

    Returns the direct address, or None when the address does not look pooled.
    """
    parts = urlsplit(uri)
    host = parts.hostname or ""
    first, _, rest = host.partition(".")
    if not first.endswith("-pooler"):
        return None
    direct_host = first[: -len("-pooler")] + ("." + rest if rest else "")
    netloc = parts.netloc.replace(host, direct_host, 1)
    return urlunsplit(parts._replace(netloc=netloc))


def migration_uri(primary: str, explicit: Optional[str] = None) -> str:
    """The address migrations must use: the explicit direct one, else derived from a pooled one, else the primary."""
    if explicit and explicit.strip():
        return normalize(explicit)
    primary = normalize(primary)
    return direct_from_pooled(primary) or primary
