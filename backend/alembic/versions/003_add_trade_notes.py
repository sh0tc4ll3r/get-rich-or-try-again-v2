"""Add trade notes columns.

Revision ID: 003
Revises: 002
Create Date: 2026-01-29

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add notes columns to trades table
    op.add_column(
        "trades",
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.add_column(
        "trades",
        sa.Column("notes_updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("trades", "notes_updated_at")
    op.drop_column("trades", "notes")
