"""Strategy service for CRUD operations."""

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Strategy, StrategyStatus


class StrategyService:
    """Service for strategy-related operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, strategy_id: int, user_id: int) -> Strategy | None:
        """Get a strategy by ID for a specific user."""
        result = await self.db.execute(
            select(Strategy).where(
                Strategy.id == strategy_id,
                Strategy.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_for_user(self, user_id: int) -> list[Strategy]:
        """List all strategies for a user."""
        result = await self.db.execute(
            select(Strategy)
            .where(Strategy.user_id == user_id)
            .order_by(Strategy.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(
        self,
        user_id: int,
        name: str,
        strategy_type: str,
        symbols: list[str],
        parameters: dict[str, Any] | None = None,
        max_position_size: float = 0.1,
        max_daily_loss: float = 0.05,
        stop_loss_pct: float | None = None,
        take_profit_pct: float | None = None,
    ) -> Strategy:
        """Create a new strategy."""
        strategy = Strategy(
            user_id=user_id,
            name=name,
            strategy_type=strategy_type,
            symbols=symbols,
            parameters=parameters or {},
            max_position_size=max_position_size,
            max_daily_loss=max_daily_loss,
            stop_loss_pct=stop_loss_pct,
            take_profit_pct=take_profit_pct,
            status=StrategyStatus.DRAFT.value,
        )
        self.db.add(strategy)
        await self.db.flush()
        return strategy

    async def update(
        self,
        strategy: Strategy,
        name: str | None = None,
        symbols: list[str] | None = None,
        parameters: dict[str, Any] | None = None,
        max_position_size: float | None = None,
        max_daily_loss: float | None = None,
        stop_loss_pct: float | None = None,
        take_profit_pct: float | None = None,
    ) -> Strategy:
        """Update a strategy."""
        if name is not None:
            strategy.name = name
        if symbols is not None:
            strategy.symbols = symbols
        if parameters is not None:
            strategy.parameters = parameters
        if max_position_size is not None:
            strategy.max_position_size = max_position_size
        if max_daily_loss is not None:
            strategy.max_daily_loss = max_daily_loss
        if stop_loss_pct is not None:
            strategy.stop_loss_pct = stop_loss_pct
        if take_profit_pct is not None:
            strategy.take_profit_pct = take_profit_pct
        return strategy

    async def delete(self, strategy: Strategy) -> None:
        """Delete a strategy."""
        await self.db.delete(strategy)

    async def deploy(self, strategy: Strategy) -> Strategy:
        """Deploy a strategy to active trading."""
        from datetime import datetime, timezone

        strategy.status = StrategyStatus.ACTIVE.value
        strategy.deployed_at = datetime.now(timezone.utc)
        return strategy

    async def pause(self, strategy: Strategy) -> Strategy:
        """Pause an active strategy."""
        strategy.status = StrategyStatus.PAUSED.value
        return strategy

    async def stop(self, strategy: Strategy) -> Strategy:
        """Stop a strategy."""
        strategy.status = StrategyStatus.STOPPED.value
        return strategy


# Strategy type definitions for the builder
STRATEGY_TYPES = {
    "momentum": {
        "name": "Momentum",
        "description": "Buy stocks showing strong upward price movement",
        "parameters": [
            {
                "name": "lookback_period",
                "label": "Lookback Period (days)",
                "type": "int",
                "default": 20,
                "min": 5,
                "max": 100,
            },
            {
                "name": "momentum_threshold",
                "label": "Momentum Threshold (%)",
                "type": "float",
                "default": 5.0,
                "min": 1.0,
                "max": 20.0,
            },
        ],
    },
    "mean_reversion": {
        "name": "Mean Reversion",
        "description": "Buy when price drops below average, sell when above",
        "parameters": [
            {
                "name": "sma_period",
                "label": "SMA Period (days)",
                "type": "int",
                "default": 20,
                "min": 5,
                "max": 200,
            },
            {
                "name": "deviation_threshold",
                "label": "Deviation Threshold (%)",
                "type": "float",
                "default": 2.0,
                "min": 0.5,
                "max": 10.0,
            },
        ],
    },
    "rsi": {
        "name": "RSI Strategy",
        "description": "Trade based on Relative Strength Index overbought/oversold levels",
        "parameters": [
            {
                "name": "rsi_period",
                "label": "RSI Period",
                "type": "int",
                "default": 14,
                "min": 5,
                "max": 50,
            },
            {
                "name": "oversold_level",
                "label": "Oversold Level",
                "type": "int",
                "default": 30,
                "min": 10,
                "max": 40,
            },
            {
                "name": "overbought_level",
                "label": "Overbought Level",
                "type": "int",
                "default": 70,
                "min": 60,
                "max": 90,
            },
        ],
    },
    "breakout": {
        "name": "Breakout",
        "description": "Buy when price breaks above recent highs",
        "parameters": [
            {
                "name": "lookback_period",
                "label": "Lookback Period (days)",
                "type": "int",
                "default": 20,
                "min": 5,
                "max": 100,
            },
            {
                "name": "breakout_threshold",
                "label": "Breakout Threshold (%)",
                "type": "float",
                "default": 1.0,
                "min": 0.5,
                "max": 5.0,
            },
        ],
    },
}
