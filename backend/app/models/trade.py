from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.strategy import Strategy
    from app.models.user import User


class OrderSide(str, Enum):
    """Order side."""

    BUY = "buy"
    SELL = "sell"


class OrderType(str, Enum):
    """Order type."""

    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"


class OrderStatus(str, Enum):
    """Order/trade status."""

    PENDING = "pending"  # Submitted, waiting for fill
    FILLED = "filled"  # Completely filled
    PARTIAL = "partial"  # Partially filled
    CANCELED = "canceled"  # Canceled by user
    REJECTED = "rejected"  # Rejected by broker
    EXPIRED = "expired"  # Time-based expiration


class TradeSource(str, Enum):
    """Where the trade originated."""

    PAPER = "paper"  # Paper trading via Alpaca
    BACKTEST = "backtest"  # From a backtest simulation
    MANUAL = "manual"  # Manual entry
    STRATEGY = "strategy"  # Automated strategy execution


class Trade(Base):
    """Executed trade/order record."""

    __tablename__ = "trades"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    strategy_id: Mapped[int | None] = mapped_column(ForeignKey("strategies.id"), nullable=True, index=True)

    # External reference (Alpaca order ID)
    broker_order_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)

    # Trade details
    symbol: Mapped[str] = mapped_column(String(20), index=True)
    side: Mapped[str] = mapped_column(String(10))  # buy/sell
    order_type: Mapped[str] = mapped_column(String(20))  # market/limit/stop/stop_limit
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 8))
    limit_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 8), nullable=True)
    stop_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 8), nullable=True)

    # Fill information
    filled_quantity: Mapped[Decimal] = mapped_column(Numeric(18, 8), default=Decimal("0"))
    filled_avg_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 8), nullable=True)
    commission: Mapped[Decimal] = mapped_column(Numeric(18, 8), default=Decimal("0"))

    # Status and source
    status: Mapped[str] = mapped_column(String(20), default=OrderStatus.PENDING.value)
    source: Mapped[str] = mapped_column(String(20), default=TradeSource.PAPER.value)

    # Signal reason (educational)
    signal_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    filled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="trades")
    strategy: Mapped["Strategy | None"] = relationship(back_populates="trades")

    @property
    def total_value(self) -> Decimal | None:
        """Calculate the total trade value."""
        if self.filled_avg_price and self.filled_quantity:
            return self.filled_avg_price * self.filled_quantity
        return None

    def __repr__(self) -> str:
        return f"<Trade {self.symbol} {self.side} {self.quantity} @ {self.status}>"
