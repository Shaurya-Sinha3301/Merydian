"""
Migration safety check, for every pull request and before every release.

Needs SQLALCHEMY_DATABASE_URI for a Postgres server where scratch databases may be created and dropped.
Run from backend/:  python scripts/deploy/check_migrations.py

Checks:
  1. the history has exactly one head
  2. an empty database built from the migrations matches the models (no drift)
  3. every migration can be undone and applied again
  4. a database from the "create missing tables" era is adopted without being rebuilt, and ends matching the models
  5. a legacy database that really differs from the models is refused and left untouched
"""
import os
import subprocess
import sys
import uuid
from urllib.parse import urlsplit, urlunsplit

import psycopg2

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BACKEND_DIR)

from app.core.db_url import normalize  # noqa: E402
from scripts import migration_tools as mt  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402

ok = True


def check(label, cond, extra=""):
    global ok
    ok = ok and bool(cond)
    print(("PASS " if cond else "FAIL ") + label + (f"  [{extra}]" if extra else ""), flush=True)


base = urlsplit(os.environ["SQLALCHEMY_DATABASE_URI"].strip().strip("\"'"))
suffix = uuid.uuid4().hex[:6]
created = []


def admin():
    con = psycopg2.connect(urlunsplit(base._replace(scheme="postgresql", path="/postgres")))
    con.autocommit = True
    return con


def scratch(label):
    name = f"migcheck_{label}_{suffix}"
    con = admin()
    con.cursor().execute(f'CREATE DATABASE "{name}"')
    con.close()
    created.append(name)
    return name


def uri_for(name):
    return urlunsplit(base._replace(path="/" + name))


def run(name, *args):
    env = dict(os.environ, SQLALCHEMY_DATABASE_URI=uri_for(name))
    env.pop("MIGRATION_DATABASE_URI", None)
    return subprocess.run([sys.executable, *args], cwd=BACKEND_DIR, env=env, capture_output=True, text=True)


def sql(name, statement):
    engine = create_engine(normalize(uri_for(name)))
    with engine.begin() as conn:
        conn.execute(text(statement))


def drift_of(name):
    engine = create_engine(normalize(uri_for(name)))
    with engine.connect() as conn:
        return mt.drift(conn)


try:
    heads = mt.head_revisions()
    check("the migration history has exactly one head", len(heads) == 1, ", ".join(heads))

    fresh = scratch("fresh")
    r = run(fresh, "-m", "alembic", "upgrade", "head")
    check("an empty database builds from the migrations", r.returncode == 0, r.stderr.strip().splitlines()[-1] if r.returncode else "")
    d = drift_of(fresh)
    check("and then matches the models exactly", not d, "; ".join(d[:3]))

    r1 = run(fresh, "-m", "alembic", "downgrade", "base")
    r2 = run(fresh, "-m", "alembic", "upgrade", "head")
    check("every migration can be undone and applied again", r1.returncode == 0 and r2.returncode == 0)

    legacy = scratch("legacy")
    run(legacy, "-m", "alembic", "upgrade", "0001")
    sql(legacy, "UPDATE alembic_version SET version_num = '6a82bcd837ab'")
    r = run(legacy, "scripts/db_bootstrap.py")
    check("a database from the old setup is adopted and brought up to date", r.returncode == 0 and "Adopting it" in r.stdout, r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr.strip()[-120:])
    d = drift_of(legacy)
    check("and ends up matching the models", not d, "; ".join(d[:3]))

    drifted = scratch("drift")
    run(drifted, "-m", "alembic", "upgrade", "0001")
    sql(drifted, "ALTER TABLE families DROP COLUMN destination")
    sql(drifted, "UPDATE alembic_version SET version_num = '6a82bcd837ab'")
    r = run(drifted, "scripts/db_bootstrap.py")
    still_legacy = "6a82bcd837ab" in str(create_engine(normalize(uri_for(drifted))).connect().execute(text("SELECT version_num FROM alembic_version")).scalar())
    check("a legacy database that really differs is refused and left untouched", r.returncode == 2 and still_legacy, f"exit {r.returncode}")
finally:
    con = admin()
    for name in created:
        con.cursor().execute(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)')
    con.close()

print("\nALL PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
