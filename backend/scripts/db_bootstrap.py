"""
Bring the database schema up to date.

The Alembic history only covers a few tables (agent_jobs references users, which
no migration creates), so `alembic upgrade head` alone fails on an empty database.
This script is safe on both fresh and existing databases:

  * Alembic already tracks the database -> run pending migrations, then create any
    tables that are still missing.
  * Not tracked yet (fresh, or built earlier with create_all) -> create every table
    from the SQLModel models, then stamp Alembic at head.

Run from the backend/ directory:  python scripts/db_bootstrap.py
"""
import importlib
import os
import pkgutil
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlmodel import SQLModel

import app.models as models_pkg
from app.core.db import engine


def main() -> None:
    # Register every table on SQLModel.metadata
    for mod in pkgutil.iter_modules(models_pkg.__path__):
        importlib.import_module(f"app.models.{mod.name}")

    cfg = Config(os.path.join(BACKEND_DIR, "alembic.ini"))
    tracked = "alembic_version" in inspect(engine).get_table_names()

    if tracked:
        print("Alembic-tracked database: running pending migrations ...")
        command.upgrade(cfg, "head")
        SQLModel.metadata.create_all(engine)
    else:
        print("Untracked database: creating tables from models, then stamping head ...")
        SQLModel.metadata.create_all(engine)
        command.stamp(cfg, "head")

    tables = sorted(inspect(engine).get_table_names())
    print(f"Schema ready ({len(tables)} tables): {', '.join(tables)}")


if __name__ == "__main__":
    main()
