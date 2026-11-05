"""
Shared helpers for the migration scripts: where the schema stands, where it should stand, and how far apart
the two are.
"""
import importlib
import os
import pkgutil
import sys
import warnings
from typing import List, Optional

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import inspect, text
from sqlmodel import SQLModel

# The two revisions that existed before migrations became the only way to change the schema.
# A database stamped with either was built by "create any missing tables" and is adopted, not rebuilt.
LEGACY_REVISIONS = {"5fa08801567f", "6a82bcd837ab"}
BASELINE_REVISION = "0001"

# What a database adopted from the legacy setup is allowed to lack: the rule added as revision 0002,
# which the upgrade that follows adoption supplies.
KNOWN_LATER_CHANGES = {"uq_itineraries_family_version"}


def alembic_config() -> Config:
    return Config(os.path.join(BACKEND_DIR, "alembic.ini"))


def register_models() -> None:
    """Import every model module so the whole schema is on SQLModel.metadata."""
    import app.models as models_pkg

    for mod in pkgutil.iter_modules(models_pkg.__path__):
        importlib.import_module(f"app.models.{mod.name}")


def head_revisions() -> List[str]:
    return list(ScriptDirectory.from_config(alembic_config()).get_heads())


def current_version(conn) -> Optional[str]:
    """The revision a database is stamped with, or None if it has no version table or an empty one."""
    if "alembic_version" not in inspect(conn).get_table_names():
        return None
    return conn.execute(text("SELECT version_num FROM alembic_version")).scalar()


def has_application_tables(conn) -> bool:
    return any(name != "alembic_version" for name in inspect(conn).get_table_names())


def drift(conn, ignore_known_later: bool = False) -> List[str]:
    """Human-readable differences between the live schema and the models. Empty means they match."""
    register_models()
    ctx = MigrationContext.configure(conn, opts={"compare_type": True})
    found: List[str] = []

    def describe(item) -> str:
        kind = item[0]
        if kind in ("add_table", "remove_table"):
            return f"{kind} {item[1].name}"
        if kind in ("add_column", "remove_column"):
            return f"{kind} {item[2]}.{item[3].name}"
        if kind.startswith("modify_"):
            return f"{kind} {item[2]}.{item[3]}"
        subject = item[1]
        table = getattr(getattr(subject, "table", None), "name", None)
        return f"{kind} {getattr(subject, 'name', None) or subject!s}" + (f" on {table}" if table else "")

    def walk(diff):
        for item in diff:
            if isinstance(item, list):
                walk(item)
                continue
            name = getattr(item[1], "name", None) if len(item) > 1 else None
            if ignore_known_later and item[0] in ("add_index", "remove_index", "remove_constraint") and name in KNOWN_LATER_CHANGES:
                continue
            found.append(describe(item))

    with warnings.catch_warnings():
        # families and itineraries point at each other; the comparison handles that, the warning is only noise
        warnings.filterwarnings("ignore", message="Cannot correctly sort tables")
        walk(compare_metadata(ctx, SQLModel.metadata))
    return found
