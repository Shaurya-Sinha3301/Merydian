"""one version number per family

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-05

Two plans for the same family can no longer share a version number. Databases that already hold the rule
(created by an earlier startup step) are left as they are. A database that holds duplicates is NOT changed:
the migration stops and says how many, because choosing which plan to keep is a human decision.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, Sequence[str], None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INDEX = "uq_itineraries_family_version"


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    # A database from the "create missing tables" era may hold the rule as a constraint. It is the same
    # rule, so it is swapped for the index the models now declare, which keeps the schema and the models identical.
    if INDEX in {c["name"] for c in inspector.get_unique_constraints("itineraries")}:
        op.drop_constraint(INDEX, "itineraries", type_="unique")
    elif INDEX in {ix["name"] for ix in inspector.get_indexes("itineraries")}:
        return
    duplicates = bind.execute(
        sa.text("SELECT count(*) FROM (SELECT 1 FROM itineraries GROUP BY family_id, version HAVING count(*) > 1) d")
    ).scalar()
    if duplicates:
        raise RuntimeError(
            f"{duplicates} (family, version) pair(s) in itineraries are used by more than one plan. "
            "Resolve them by hand, then run the migration again."
        )
    op.create_index(INDEX, "itineraries", ["family_id", "version"], unique=True)


def downgrade() -> None:
    op.drop_index(INDEX, table_name="itineraries")
