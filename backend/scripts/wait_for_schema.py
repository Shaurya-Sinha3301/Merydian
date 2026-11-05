"""
Wait until the database is at the schema version this code expects, then exit 0.

Services that do not migrate (the API in a multi-service setup, the workers, the scheduler) run this before
starting, so new code never serves traffic against an older schema. The service that migrates runs
scripts/db_bootstrap.py instead.

Run from the backend/ directory:  python scripts/wait_for_schema.py [seconds to wait, default 300]
"""
import os
import sys
import time

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import create_engine

from app.core.db_url import normalize
from scripts import migration_tools as mt


def main() -> int:
    patience = int(sys.argv[1]) if len(sys.argv) > 1 else 300
    heads = mt.head_revisions()
    if len(heads) != 1:
        print(f"The migration history has {len(heads)} heads; it must have exactly one.")
        return 1
    want = heads[0]
    engine = create_engine(normalize(os.environ["SQLALCHEMY_DATABASE_URI"]), pool_pre_ping=True)
    deadline = time.time() + patience
    last = "unknown"
    while True:
        try:
            with engine.connect() as conn:
                last = mt.current_version(conn) or "none"
            if last == want:
                print(f"Schema is at the expected revision {want}.")
                return 0
        except Exception as exc:  # the database may still be starting
            last = f"unreachable ({type(exc).__name__})"
        if time.time() > deadline:
            print(f"Gave up waiting: the database is at {last}, this code expects {want}. Has the migration service run?")
            return 1
        print(f"Waiting for the schema: database at {last}, expected {want} ...")
        time.sleep(3)


if __name__ == "__main__":
    sys.exit(main())
