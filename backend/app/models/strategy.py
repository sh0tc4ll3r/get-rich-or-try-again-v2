from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.backtest import Backtest
    from app.models.trade import Trade
    from app.models.user import User


class StrategyStatus(str, Enum):
    """Strategy deployment status."""

    DRAFT = "draft"  # Strategy created but not deployed
    ACTIVE = "active"  # Currently running in paper trading
    PAUSED = "paused"  # Temporarily paused
    STOPPED = "stopped"  # Manually stopped


class Strategy(Base):
    """User-configured trading strategy."""

    __tablename__ = "strategies"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    # Strategy identification
    name: Mapped[str] = mapped_column(String(255))
    strategy_type: Mapped[str] = mapped_column(String(100))  # e.g., 'momentum', 'mean_reversion'

    # Configuration
    symbols: Mapped[list[str]] = mapped_column(ARRAY(String))  # Stocks to trade
    parameters: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)  # Strategy params

    # Risk settings
    max_position_size: Mapped[float] = mapped_column(default=0.1)  # % of portfolio
    max_daily_loss: Mapped[float] = mapped_column(default=0.05)  # % daily loss limit
    stop_loss_pct: Mapped[float | None] = mapped_column(nullable=True)  # Per-trade stop loss %
    take_profit_pct: Mapped[float | None] = mapped_column(nullable=True)  # Per-trade take profit %

    # Status
    status: Mapped[str] = mapped_column(String(50), default=StrategyStatus.DRAFT.value)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deployed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="strategies")
    backtests: Mapped[list["Backtest"]] = relationship(back_populates="strategy")
    trades: Mapped[list["Trade"]] = relationship(back_populates="strategy")

    def __repr__(self) -> str:
        return f"<Strategy {self.name} ({self.strategy_type})>"
