"""Initial models - users, strategies, backtests, trades.

Revision ID: 001
Revises:
Create Date: 2026-01-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("clerk_id", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("alpaca_api_key", sa.String(255), nullable=True),
        sa.Column("alpaca_secret_key", sa.String(255), nullable=True),
        sa.Column("alpaca_connected", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_clerk_id", "users", ["clerk_id"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # Strategies table
    op.create_table(
        "strategies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("strategy_type", sa.String(100), nullable=False),
        sa.Column("symbols", postgresql.ARRAY(sa.String()), nullable=False),
        sa.Column("parameters", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("max_position_size", sa.Float(), nullable=False, server_default="0.1"),
        sa.Column("max_daily_loss", sa.Float(), nullable=False, server_default="0.05"),
        sa.Column("stop_loss_pct", sa.Float(), nullable=True),
        sa.Column("take_profit_pct", sa.Float(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="'draft'"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deployed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_strategies_user_id", "strategies", ["user_id"])

    # Backtests table
    op.create_table(
        "backtests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("strategy_id", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("initial_capital", sa.Float(), nullable=False, server_default="100000.0"),
        sa.Column("parameters_snapshot", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(50), nullable=False, server_default="'pending'"),
        sa.Column("error_message", sa.String(1000), nullable=True),
        sa.Column("total_return", sa.Float(), nullable=True),
        sa.Column("sharpe_ratio", sa.Float(), nullable=True),
        sa.Column("sortino_ratio", sa.Float(), nullable=True),
        sa.Column("max_drawdown", sa.Float(), nullable=True),
        sa.Column("win_rate", sa.Float(), nullable=True),
        sa.Column("profit_factor", sa.Float(), nullable=True),
        sa.Column("total_trades", sa.Integer(), nullable=True),
        sa.Column("final_value", sa.Float(), nullable=True),
        sa.Column("equity_curve", postgresql.JSONB(), nullable=True),
        sa.Column("trade_log", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["strategy_id"], ["strategies.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_backtests_user_id", "backtests", ["user_id"])
    op.create_index("ix_backtests_strategy_id", "backtests", ["strategy_id"])

    # Trades table
    op.create_table(
        "trades",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("strategy_id", sa.Integer(), nullable=True),
        sa.Column("broker_order_id", sa.String(255), nullable=True),
        sa.Column("symbol", sa.String(20), nullable=False),
        sa.Column("side", sa.String(10), nullable=False),
        sa.Column("order_type", sa.String(20), nullable=False),
        sa.Column("quantity", sa.Numeric(18, 8), nullable=False),
        sa.Column("limit_price", sa.Numeric(18, 8), nullable=True),
        sa.Column("stop_price", sa.Numeric(18, 8), nullable=True),
        sa.Column("filled_quantity", sa.Numeric(18, 8), nullable=False, server_default="0"),
        sa.Column("filled_avg_price", sa.Numeric(18, 8), nullable=True),
        sa.Column("commission", sa.Numeric(18, 8), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="'pending'"),
        sa.Column("source", sa.String(20), nullable=False, server_default="'paper'"),
        sa.Column("signal_reason", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("filled_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["strategy_id"], ["strategies.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_trades_user_id", "trades", ["user_id"])
    op.create_index("ix_trades_strategy_id", "trades", ["strategy_id"])
    op.create_index("ix_trades_symbol", "trades", ["symbol"])
    op.create_index("ix_trades_broker_order_id", "trades", ["broker_order_id"])


def downgrade() -> None:
    op.drop_table("trades")
    op.drop_table("backtests")
    op.drop_table("strategies")
    op.drop_table("users")
