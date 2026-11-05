"""place request job type

A new job type, POI_PROPOSAL: working out whether a requested place fits the plan now runs as a
background job instead of inside the web request.

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-05
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0008"
down_revision: Union[str, Sequence[str], None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Allowed inside a transaction on Postgres 12 and later, as long as the value is not used in it
    op.execute("ALTER TYPE jobtype ADD VALUE IF NOT EXISTS 'POI_PROPOSAL'")


def downgrade() -> None:
    # Postgres cannot drop a value from an enum type. The extra value is harmless to older code,
    # so the downgrade leaves it in place (no POI_PROPOSAL jobs are created once this code is gone).
    pass
