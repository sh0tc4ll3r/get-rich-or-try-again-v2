"""Strategy execution for live trading."""

import logging
import math
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Strategy, Trade, TradeSource, User
from app.services.alpaca import AlpacaService
from app.services.backtest import StrategyExecutor

logger = logging.getLogger(__name__)


class StrategyRunner:
    """Executes a trading strategy using live market data."""

    def __init__(
        self,
        db: AsyncSession,
        user: User,
        strategy: Strategy,
    ):
        self.db = db
        self.user = user
        self.strategy = strategy
        self.alpaca = AlpacaService(
            api_key=user.alpaca_api_key,
            secret_key=user.alpaca_secret_key,
            paper=True,
        )
        self.signals: list[dict[str, Any]] = []

    async def execute(self) -> list[dict[str, Any]]:
        """Execute the strategy and return generated signals."""
        logger.info(f"Executing strategy {self.strategy.id}: {self.strategy.name}")

        try:
            # Get account info for position sizing
            account = self.alpaca.get_account()
            portfolio_value = float(account.portfolio_value)

            # Get current positions
            positions = {p.symbol: p for p in self.alpaca.get_positions()}

            # Check daily loss limit
            daily_pnl = float(account.equity) - float(account.last_equity)
            daily_pnl_pct = daily_pnl / float(account.last_equity) if float(account.last_equity) > 0 else 0

            if daily_pnl_pct < -self.strategy.max_daily_loss:
                logger.warning(
                    f"Strategy {self.strategy.id}: Daily loss limit reached "
                    f"({daily_pnl_pct:.2%} vs -{self.strategy.max_daily_loss:.2%})"
                )
                return []

            # Process each symbol
            for symbol in self.strategy.symbols:
                try:
                    signal = await self._process_symbol(
                        symbol=symbol,
                        portfolio_value=portfolio_value,
                        current_position=positions.get(symbol),
                    )
                    if signal:
                        self.signals.append(signal)
                except Exception as e:
                    logger.error(f"Error processing {symbol}: {e}")

            return self.signals

        except Exception as e:
            logger.error(f"Strategy execution error: {e}")
            raise

    async def _process_symbol(
        self,
        symbol: str,
        portfolio_value: float,
        current_position: Any | None,
    ) -> dict[str, Any] | None:
        """Process a single symbol and generate signal if applicable."""
        # Fetch recent market data (last 50 days for indicators)
        end = datetime.now(timezone.utc)
        start = end - timedelta(days=60)

        bars = self.alpaca.get_bars(
            symbol=symbol,
            timeframe="1Day",
            start=start,
            end=end,
            limit=50,
        )

        if len(bars) < 20:
            logger.warning(f"Insufficient data for {symbol}: {len(bars)} bars")
            return None

        # Convert to DataFrame
        df = pd.DataFrame([{
            "date": b.timestamp.date(),
            "open": float(b.open),
            "high": float(b.high),
            "low": float(b.low),
            "close": float(b.close),
            "volume": b.volume,
        } for b in bars])
        df = df.set_index("date").sort_index()

        # Apply strategy logic
        executor = StrategyExecutor()
        strategy_func = {
            "momentum": executor.momentum_strategy,
            "mean_reversion": executor.mean_reversion_strategy,
            "rsi": executor.rsi_strategy,
            "breakout": executor.breakout_strategy,
        }.get(self.strategy.strategy_type)

        if not strategy_func:
            logger.error(f"Unknown strategy type: {self.strategy.strategy_type}")
            return None

        df = strategy_func(df, **self.strategy.parameters)

        # Get the latest signal
        latest = df.iloc[-1]
        signal_value = latest.get("signal", 0)

        if pd.isna(signal_value):
            return None

        current_price = latest["close"]
        has_position = current_position is not None

        # Generate order if signal indicates action
        if signal_value == 1 and not has_position:
            # Buy signal - no position
            return await self._execute_buy(
                symbol=symbol,
                price=current_price,
                portfolio_value=portfolio_value,
                reason=f"{self.strategy.strategy_type} buy signal",
            )

        elif signal_value == -1 and has_position:
            # Sell signal - has position
            qty = float(current_position.qty)
            return await self._execute_sell(
                symbol=symbol,
                qty=qty,
                price=current_price,
                reason=f"{self.strategy.strategy_type} sell signal",
            )

        # Check stop loss / take profit for existing positions
        if has_position:
            entry_price = float(current_position.avg_entry_price)
            pnl_pct = (current_price - entry_price) / entry_price

            if self.strategy.stop_loss_pct and pnl_pct < -self.strategy.stop_loss_pct:
                qty = float(current_position.qty)
                return await self._execute_sell(
                    symbol=symbol,
                    qty=qty,
                    price=current_price,
                    reason="stop loss triggered",
                )

            if self.strategy.take_profit_pct and pnl_pct > self.strategy.take_profit_pct:
                qty = float(current_position.qty)
                return await self._execute_sell(
                    symbol=symbol,
                    qty=qty,
                    price=current_price,
                    reason="take profit triggered",
                )

        return None

    async def _execute_buy(
        self,
        symbol: str,
        price: float,
        portfolio_value: float,
        reason: str,
    ) -> dict[str, Any]:
        """Execute a buy order."""
        # Calculate position size
        max_position_value = portfolio_value * self.strategy.max_position_size
        qty = math.floor(max_position_value / price)

        if qty <= 0:
            logger.info(f"Calculated qty is 0 for {symbol}, skipping")
            return {"symbol": symbol, "action": "skip", "reason": "qty too small"}

        # Place order via Alpaca
        try:
            order = self.alpaca.place_market_order(
                symbol=symbol,
                qty=Decimal(str(qty)),
                side="buy",
            )

            # Record trade in database
            trade = Trade(
                user_id=self.user.id,
                strategy_id=self.strategy.id,
                broker_order_id=order.order_id,
                symbol=symbol,
                side="buy",
                order_type="market",
                quantity=Decimal(str(qty)),
                source=TradeSource.STRATEGY.value,
                signal_reason=reason,
                status=order.status,
            )
            self.db.add(trade)

            logger.info(f"BUY {qty} {symbol} @ ~{price:.2f} ({reason})")

            return {
                "symbol": symbol,
                "action": "buy",
                "qty": qty,
                "price": price,
                "order_id": order.order_id,
                "status": order.status,
                "reason": reason,
            }

        except Exception as e:
            logger.error(f"Failed to place buy order for {symbol}: {e}")
            return {
                "symbol": symbol,
                "action": "buy_failed",
                "error": str(e),
                "reason": reason,
            }

    async def _execute_sell(
        self,
        symbol: str,
        qty: float,
        price: float,
        reason: str,
    ) -> dict[str, Any]:
        """Execute a sell order."""
        try:
            order = self.alpaca.place_market_order(
                symbol=symbol,
                qty=Decimal(str(qty)),
                side="sell",
            )

            # Record trade in database
            trade = Trade(
                user_id=self.user.id,
                strategy_id=self.strategy.id,
                broker_order_id=order.order_id,
                symbol=symbol,
                side="sell",
                order_type="market",
                quantity=Decimal(str(qty)),
                source=TradeSource.STRATEGY.value,
                signal_reason=reason,
                status=order.status,
            )
            self.db.add(trade)

            logger.info(f"SELL {qty} {symbol} @ ~{price:.2f} ({reason})")

            return {
                "symbol": symbol,
                "action": "sell",
                "qty": qty,
                "price": price,
                "order_id": order.order_id,
                "status": order.status,
                "reason": reason,
            }

        except Exception as e:
            logger.error(f"Failed to place sell order for {symbol}: {e}")
            return {
                "symbol": symbol,
                "action": "sell_failed",
                "error": str(e),
                "reason": reason,
            }


async def execute_strategy_once(
    db: AsyncSession,
    user: User,
    strategy: Strategy,
) -> list[dict[str, Any]]:
    """Convenience function to execute a strategy once."""
    runner = StrategyRunner(db=db, user=user, strategy=strategy)
    return await runner.execute()
