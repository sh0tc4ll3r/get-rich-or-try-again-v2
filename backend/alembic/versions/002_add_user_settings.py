"""Add user default risk settings.

Revision ID: 002
Revises: 001
Create Date: 2026-01-25

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add default risk settings columns to users table
    op.add_column(
        "users",
        sa.Column("default_max_position_size", sa.Float(), nullable=False, server_default="0.1"),
    )
    op.add_column(
        "users",
        sa.Column("default_max_daily_loss", sa.Float(), nullable=False, server_default="0.05"),
    )
    op.add_column(
        "users",
        sa.Column("default_stop_loss_pct", sa.Float(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("default_take_profit_pct", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "default_take_profit_pct")
    op.drop_column("users", "default_stop_loss_pct")
    op.drop_column("users", "default_max_daily_loss")
    op.drop_column("users", "default_max_position_size")
