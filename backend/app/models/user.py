from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.backtest import Backtest
    from app.models.strategy import Strategy
    from app.models.trade import Trade


class User(Base):
    """User model synced with Clerk authentication."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    clerk_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(255))

    # Alpaca integration (encrypted in production)
    alpaca_api_key: Mapped[str | None] = mapped_column(String(255))
    alpaca_secret_key: Mapped[str | None] = mapped_column(String(255))
    alpaca_connected: Mapped[bool] = mapped_column(default=False)

    # Default risk settings (used as defaults for new strategies)
    default_max_position_size: Mapped[float] = mapped_column(Float, default=0.1)  # 10%
    default_max_daily_loss: Mapped[float] = mapped_column(Float, default=0.05)  # 5%
    default_stop_loss_pct: Mapped[float | None] = mapped_column(Float, nullable=True, default=0.05)
    default_take_profit_pct: Mapped[float | None] = mapped_column(Float, nullable=True, default=0.10)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    strategies: Mapped[list["Strategy"]] = relationship(back_populates="user")
    backtests: Mapped[list["Backtest"]] = relationship(back_populates="user")
    trades: Mapped[list["Trade"]] = relationship(back_populates="user")

    def __repr__(self) -> str:
        return f"<User {self.email}>"
