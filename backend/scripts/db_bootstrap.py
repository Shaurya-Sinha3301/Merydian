"""
Bring the database schema up to date. Migrations are the only way the schema changes.

What it does, in order:
  1. Connects DIRECTLY to the database (not through a pooler) and takes a database-wide lock, so two
     containers starting together cannot migrate at the same time. The second one waits, then finds nothing to do.
  2. Looks at where the database stands:
       * empty                              -> builds everything from the migrations
       * stamped with an old revision, or has
         tables but no version at all       -> a database from the "create missing tables" era. It is checked
                                               against the models and, if it matches, adopted (stamped at the
                                               baseline) without being rebuilt. If it does not match, nothing is
                                               touched and the differences are listed.
       * already at a current revision      -> nothing special
  3. Runs every pending migration.
  4. Checks the result against the models. A schema that still differs stops the start-up, because code run
     against the wrong schema fails later and less clearly. Set MIGRATION_ALLOW_DRIFT=true to continue anyway.

Run from the backend/ directory:  python scripts/db_bootstrap.py
"""
import os
import sys
import time

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from alembic import command
from sqlalchemy import create_engine, inspect, text

from app.core.db_url import direct_from_pooled, migration_uri, normalize
from scripts import migration_tools as mt

LOCK_KEY = 7200001  # arbitrary, but the same for every process that migrates this database
LOCK_WAIT_SECONDS = 180


def _take_lock(conn) -> None:
    deadline = time.time() + LOCK_WAIT_SECONDS
    announced = False
    while True:
        if conn.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": LOCK_KEY}).scalar():
            return
        if not announced:
            print("Another process is migrating this database; waiting for it to finish ...")
            announced = True
        if time.time() > deadline:
            raise SystemExit("Gave up waiting for the migration lock. Is another migration stuck?")
        time.sleep(1)


def main() -> None:
    primary = os.environ["SQLALCHEMY_DATABASE_URI"]
    explicit = os.environ.get("MIGRATION_DATABASE_URI", "")
    uri = migration_uri(primary, explicit)
    if explicit.strip():
        print("Migrating over the explicit direct address.")
    elif direct_from_pooled(normalize(primary)):
        print("The configured address is pooled; migrating over the direct address derived from it.")

    mt.register_models()
    cfg = mt.alembic_config()
    heads = mt.head_revisions()
    if len(heads) != 1:
        raise SystemExit(f"The migration history has {len(heads)} heads ({', '.join(heads)}); it must have exactly one.")

    engine = create_engine(uri, pool_pre_ping=True)
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as lock_conn:
        _take_lock(lock_conn)
        try:
            with engine.connect() as conn:
                version = mt.current_version(conn)
                populated = mt.has_application_tables(conn)

            if not populated:
                print("Empty database: building it from the migrations ...")
            elif version in mt.LEGACY_REVISIONS or version is None:
                print(f"Database from before migrations took over (version: {version or 'none'}): checking it against the models ...")
                with engine.connect() as conn:
                    differences = mt.drift(conn, ignore_known_later=True)
                if differences:
                    print("Not adopting it. These differ from the models and need a human decision:")
                    for line in differences:
                        print("  -", line)
                    raise SystemExit(2)
                print(f"It matches. Adopting it at baseline {mt.BASELINE_REVISION} without rebuilding anything.")
                command.stamp(cfg, mt.BASELINE_REVISION, purge=True)
            else:
                print(f"Database at revision {version}.")

            command.upgrade(cfg, "head")

            with engine.connect() as conn:
                final = mt.drift(conn)
            if final:
                print("The schema still differs from the models after migrating:")
                for line in final:
                    print("  -", line)
                if os.environ.get("MIGRATION_ALLOW_DRIFT", "").lower() != "true":
                    raise SystemExit(3)
                print("Continuing because MIGRATION_ALLOW_DRIFT=true.")
        finally:
            lock_conn.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": LOCK_KEY})

    with engine.connect() as conn:
        tables = sorted(t for t in inspect(conn).get_table_names())
        print(f"Schema ready at {mt.current_version(conn)} ({len(tables)} tables).")


if __name__ == "__main__":
    main()
