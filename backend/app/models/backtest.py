from datetime import date, datetime
from enum import Enum
from typing import TYPE_CHECKING, Any

from sqlalchemy import Date, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.strategy import Strategy
    from app.models.user import User


class BacktestStatus(str, Enum):
    """Backtest execution status."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Backtest(Base):
    """Backtest run for a strategy."""

    __tablename__ = "backtests"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    strategy_id: Mapped[int] = mapped_column(ForeignKey("strategies.id"), index=True)

    # Backtest configuration
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    initial_capital: Mapped[float] = mapped_column(default=100000.0)

    # Strategy parameters snapshot (in case strategy is modified later)
    parameters_snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)

    # Status
    status: Mapped[str] = mapped_column(String(50), default=BacktestStatus.PENDING.value)
    error_message: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # Results (populated when completed)
    total_return: Mapped[float | None] = mapped_column(nullable=True)  # e.g., 0.15 = 15%
    sharpe_ratio: Mapped[float | None] = mapped_column(nullable=True)
    sortino_ratio: Mapped[float | None] = mapped_column(nullable=True)
    max_drawdown: Mapped[float | None] = mapped_column(nullable=True)  # e.g., 0.10 = 10%
    win_rate: Mapped[float | None] = mapped_column(nullable=True)  # e.g., 0.55 = 55%
    profit_factor: Mapped[float | None] = mapped_column(nullable=True)
    total_trades: Mapped[int | None] = mapped_column(nullable=True)
    final_value: Mapped[float | None] = mapped_column(nullable=True)

    # Detailed results (equity curve, trade list, etc.)
    equity_curve: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)
    trade_log: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="backtests")
    strategy: Mapped["Strategy"] = relationship(back_populates="backtests")

    def __repr__(self) -> str:
        return f"<Backtest {self.id} ({self.status})>"
