"""Trade service for managing trade records."""

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Trade, OrderStatus, TradeSource


class TradeService:
    """Service for trade-related operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, trade_id: int, user_id: int) -> Trade | None:
        """Get a trade by ID for a specific user."""
        result = await self.db.execute(
            select(Trade).where(
                Trade.id == trade_id,
                Trade.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_for_user(
        self,
        user_id: int,
        limit: int = 50,
        source: str | None = None,
    ) -> list[Trade]:
        """List trades for a user."""
        query = select(Trade).where(Trade.user_id == user_id)

        if source:
            query = query.where(Trade.source == source)

        query = query.order_by(Trade.created_at.desc()).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(
        self,
        user_id: int,
        symbol: str,
        side: str,
        order_type: str,
        quantity: Decimal,
        limit_price: Decimal | None = None,
        stop_price: Decimal | None = None,
        strategy_id: int | None = None,
        broker_order_id: str | None = None,
        source: str = TradeSource.PAPER.value,
        signal_reason: str | None = None,
    ) -> Trade:
        """Create a new trade record."""
        trade = Trade(
            user_id=user_id,
            strategy_id=strategy_id,
            broker_order_id=broker_order_id,
            symbol=symbol.upper(),
            side=side,
            order_type=order_type,
            quantity=quantity,
            limit_price=limit_price,
            stop_price=stop_price,
            source=source,
            signal_reason=signal_reason,
            status=OrderStatus.PENDING.value,
            submitted_at=datetime.now(timezone.utc),
        )
        self.db.add(trade)
        await self.db.flush()
        return trade

    async def update_fill(
        self,
        trade: Trade,
        filled_quantity: Decimal,
        filled_avg_price: Decimal,
        commission: Decimal = Decimal("0"),
    ) -> Trade:
        """Update trade with fill information."""
        trade.filled_quantity = filled_quantity
        trade.filled_avg_price = filled_avg_price
        trade.commission = commission
        trade.filled_at = datetime.now(timezone.utc)

        if filled_quantity >= trade.quantity:
            trade.status = OrderStatus.FILLED.value
        elif filled_quantity > 0:
            trade.status = OrderStatus.PARTIAL.value

        return trade

    async def cancel(self, trade: Trade) -> Trade:
        """Cancel a trade."""
        trade.status = OrderStatus.CANCELED.value
        return trade
