"""plan revision

families.plan_rev: goes up by one every time a family's current plan changes (a new version, a revert, a
reset), so the read cache can refuse to overwrite a newer plan with an older one. The plan's own version
number cannot do this: a revert points the family back at an older version.

Revision ID: 0011
Revises: 0010
Create Date: 2026-11-06 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0011'
down_revision: Union[str, Sequence[str], None] = '0010'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('families', sa.Column('plan_rev', sa.BigInteger(), server_default='0', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('families', 'plan_rev')
