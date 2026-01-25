"""Backtesting engine service."""

import math
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Backtest, BacktestStatus, Strategy
from app.services.alpaca import AlpacaService


class BacktestEngine:
    """Engine for running strategy backtests."""

    def __init__(self, initial_capital: float = 100000.0):
        self.initial_capital = initial_capital
        self.cash = initial_capital
        self.positions: dict[str, dict] = {}  # symbol -> {qty, avg_price}
        self.trades: list[dict] = []
        self.equity_curve: list[dict] = []
        self.current_date: date | None = None

    def reset(self):
        """Reset the engine state."""
        self.cash = self.initial_capital
        self.positions = {}
        self.trades = []
        self.equity_curve = []
        self.current_date = None

    def get_portfolio_value(self, prices: dict[str, float]) -> float:
        """Calculate total portfolio value."""
        positions_value = sum(
            pos["qty"] * prices.get(symbol, pos["avg_price"])
            for symbol, pos in self.positions.items()
        )
        return self.cash + positions_value

    def execute_buy(
        self,
        symbol: str,
        qty: float,
        price: float,
        reason: str = "",
    ) -> dict | None:
        """Execute a buy order."""
        cost = qty * price
        if cost > self.cash:
            # Adjust quantity to available cash
            qty = math.floor(self.cash / price)
            if qty <= 0:
                return None
            cost = qty * price

        self.cash -= cost

        if symbol in self.positions:
            # Average up/down
            old_qty = self.positions[symbol]["qty"]
            old_avg = self.positions[symbol]["avg_price"]
            new_qty = old_qty + qty
            new_avg = (old_qty * old_avg + qty * price) / new_qty
            self.positions[symbol] = {"qty": new_qty, "avg_price": new_avg}
        else:
            self.positions[symbol] = {"qty": qty, "avg_price": price}

        trade = {
            "date": self.current_date.isoformat() if self.current_date else "",
            "symbol": symbol,
            "side": "buy",
            "qty": qty,
            "price": price,
            "value": cost,
            "reason": reason,
        }
        self.trades.append(trade)
        return trade

    def execute_sell(
        self,
        symbol: str,
        qty: float,
        price: float,
        reason: str = "",
    ) -> dict | None:
        """Execute a sell order."""
        if symbol not in self.positions:
            return None

        available_qty = self.positions[symbol]["qty"]
        qty = min(qty, available_qty)
        if qty <= 0:
            return None

        proceeds = qty * price
        self.cash += proceeds

        entry_price = self.positions[symbol]["avg_price"]
        pnl = (price - entry_price) * qty
        pnl_pct = (price / entry_price - 1) * 100

        self.positions[symbol]["qty"] -= qty
        if self.positions[symbol]["qty"] <= 0:
            del self.positions[symbol]

        trade = {
            "date": self.current_date.isoformat() if self.current_date else "",
            "symbol": symbol,
            "side": "sell",
            "qty": qty,
            "price": price,
            "value": proceeds,
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
            "reason": reason,
        }
        self.trades.append(trade)
        return trade

    def record_equity(self, dt: date, prices: dict[str, float]):
        """Record equity curve point."""
        portfolio_value = self.get_portfolio_value(prices)
        self.equity_curve.append({
            "date": dt.isoformat(),
            "equity": round(portfolio_value, 2),
            "cash": round(self.cash, 2),
        })


class StrategyExecutor:
    """Executes trading strategies on historical data."""

    @staticmethod
    def momentum_strategy(
        df: pd.DataFrame,
        lookback_period: int = 20,
        momentum_threshold: float = 5.0,
    ) -> pd.DataFrame:
        """Generate momentum signals.

        Buy when price momentum exceeds threshold.
        Sell when momentum turns negative.
        """
        df = df.copy()
        df["returns"] = df["close"].pct_change(lookback_period) * 100
        df["signal"] = 0

        # Buy signal: momentum > threshold
        df.loc[df["returns"] > momentum_threshold, "signal"] = 1
        # Sell signal: momentum < 0
        df.loc[df["returns"] < 0, "signal"] = -1

        return df

    @staticmethod
    def mean_reversion_strategy(
        df: pd.DataFrame,
        sma_period: int = 20,
        deviation_threshold: float = 2.0,
    ) -> pd.DataFrame:
        """Generate mean reversion signals.

        Buy when price is below SMA by threshold.
        Sell when price returns to SMA or above.
        """
        df = df.copy()
        df["sma"] = df["close"].rolling(window=sma_period).mean()
        df["deviation"] = ((df["close"] - df["sma"]) / df["sma"]) * 100
        df["signal"] = 0

        # Buy signal: price below SMA by threshold
        df.loc[df["deviation"] < -deviation_threshold, "signal"] = 1
        # Sell signal: price above SMA
        df.loc[df["deviation"] > 0, "signal"] = -1

        return df

    @staticmethod
    def rsi_strategy(
        df: pd.DataFrame,
        rsi_period: int = 14,
        oversold_level: int = 30,
        overbought_level: int = 70,
    ) -> pd.DataFrame:
        """Generate RSI signals.

        Buy when RSI is oversold.
        Sell when RSI is overbought.
        """
        df = df.copy()

        # Calculate RSI
        delta = df["close"].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=rsi_period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=rsi_period).mean()
        rs = gain / loss
        df["rsi"] = 100 - (100 / (1 + rs))
        df["signal"] = 0

        # Buy signal: RSI oversold
        df.loc[df["rsi"] < oversold_level, "signal"] = 1
        # Sell signal: RSI overbought
        df.loc[df["rsi"] > overbought_level, "signal"] = -1

        return df

    @staticmethod
    def breakout_strategy(
        df: pd.DataFrame,
        lookback_period: int = 20,
        breakout_threshold: float = 1.0,
    ) -> pd.DataFrame:
        """Generate breakout signals.

        Buy when price breaks above recent high.
        Sell when price falls below entry by threshold.
        """
        df = df.copy()
        df["high_lookback"] = df["high"].rolling(window=lookback_period).max()
        df["breakout_pct"] = ((df["close"] - df["high_lookback"].shift(1)) /
                              df["high_lookback"].shift(1)) * 100
        df["signal"] = 0

        # Buy signal: price breaks above lookback high
        df.loc[df["breakout_pct"] > breakout_threshold, "signal"] = 1

        return df


def calculate_metrics(
    equity_curve: list[dict],
    trades: list[dict],
    initial_capital: float,
) -> dict[str, Any]:
    """Calculate backtest performance metrics."""
    if not equity_curve:
        return {}

    # Convert to numpy for calculations
    equities = np.array([e["equity"] for e in equity_curve])
    dates = [e["date"] for e in equity_curve]

    final_value = equities[-1]
    total_return = (final_value / initial_capital - 1) * 100

    # Daily returns
    daily_returns = np.diff(equities) / equities[:-1]

    # Sharpe ratio (assuming 252 trading days, 0% risk-free rate)
    if len(daily_returns) > 1 and np.std(daily_returns) > 0:
        sharpe_ratio = np.sqrt(252) * np.mean(daily_returns) / np.std(daily_returns)
    else:
        sharpe_ratio = 0.0

    # Sortino ratio (downside deviation only)
    downside_returns = daily_returns[daily_returns < 0]
    if len(downside_returns) > 1 and np.std(downside_returns) > 0:
        sortino_ratio = np.sqrt(252) * np.mean(daily_returns) / np.std(downside_returns)
    else:
        sortino_ratio = 0.0

    # Maximum drawdown
    peak = np.maximum.accumulate(equities)
    drawdown = (peak - equities) / peak
    max_drawdown = np.max(drawdown) * 100

    # Trade statistics
    winning_trades = [t for t in trades if t.get("pnl", 0) > 0]
    losing_trades = [t for t in trades if t.get("pnl", 0) < 0]
    total_trades = len([t for t in trades if t["side"] == "sell"])

    win_rate = len(winning_trades) / total_trades * 100 if total_trades > 0 else 0

    # Profit factor
    gross_profit = sum(t.get("pnl", 0) for t in winning_trades)
    gross_loss = abs(sum(t.get("pnl", 0) for t in losing_trades))
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else float("inf")

    return {
        "total_return": round(total_return, 2),
        "sharpe_ratio": round(sharpe_ratio, 2),
        "sortino_ratio": round(sortino_ratio, 2),
        "max_drawdown": round(max_drawdown, 2),
        "win_rate": round(win_rate, 2),
        "profit_factor": round(profit_factor, 2) if profit_factor != float("inf") else None,
        "total_trades": total_trades,
        "final_value": round(final_value, 2),
    }


class BacktestService:
    """Service for managing backtests."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, backtest_id: int, user_id: int) -> Backtest | None:
        """Get a backtest by ID for a specific user."""
        result = await self.db.execute(
            select(Backtest).where(
                Backtest.id == backtest_id,
                Backtest.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_for_user(self, user_id: int, limit: int = 50) -> list[Backtest]:
        """List backtests for a user."""
        result = await self.db.execute(
            select(Backtest)
            .where(Backtest.user_id == user_id)
            .order_by(Backtest.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_for_strategy(self, strategy_id: int, user_id: int) -> list[Backtest]:
        """List backtests for a specific strategy."""
        result = await self.db.execute(
            select(Backtest)
            .where(
                Backtest.strategy_id == strategy_id,
                Backtest.user_id == user_id,
            )
            .order_by(Backtest.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(
        self,
        user_id: int,
        strategy: Strategy,
        start_date: date,
        end_date: date,
        initial_capital: float = 100000.0,
    ) -> Backtest:
        """Create a new backtest record."""
        backtest = Backtest(
            user_id=user_id,
            strategy_id=strategy.id,
            start_date=start_date,
            end_date=end_date,
            initial_capital=initial_capital,
            parameters_snapshot=strategy.parameters,
            status=BacktestStatus.PENDING.value,
        )
        self.db.add(backtest)
        await self.db.flush()
        return backtest

    async def run(
        self,
        backtest: Backtest,
        strategy: Strategy,
        alpaca: AlpacaService,
    ) -> Backtest:
        """Run a backtest simulation."""
        backtest.status = BacktestStatus.RUNNING.value
        backtest.started_at = datetime.now(timezone.utc)
        await self.db.flush()

        try:
            engine = BacktestEngine(initial_capital=backtest.initial_capital)
            executor = StrategyExecutor()

            # Get strategy execution function
            strategy_func = {
                "momentum": executor.momentum_strategy,
                "mean_reversion": executor.mean_reversion_strategy,
                "rsi": executor.rsi_strategy,
                "breakout": executor.breakout_strategy,
            }.get(strategy.strategy_type)

            if not strategy_func:
                raise ValueError(f"Unknown strategy type: {strategy.strategy_type}")

            # Fetch historical data for all symbols
            all_data: dict[str, pd.DataFrame] = {}
            for symbol in strategy.symbols:
                bars = alpaca.get_bars(
                    symbol=symbol,
                    timeframe="1Day",
                    start=datetime.combine(backtest.start_date, datetime.min.time()),
                    end=datetime.combine(backtest.end_date, datetime.max.time()),
                    limit=10000,
                )
                if bars:
                    df = pd.DataFrame([{
                        "date": b.timestamp.date(),
                        "open": float(b.open),
                        "high": float(b.high),
                        "low": float(b.low),
                        "close": float(b.close),
                        "volume": b.volume,
                    } for b in bars])
                    df = df.set_index("date").sort_index()

                    # Apply strategy to generate signals
                    df = strategy_func(df, **strategy.parameters)
                    all_data[symbol] = df

            if not all_data:
                raise ValueError("No historical data available for symbols")

            # Get all unique dates
            all_dates = sorted(set().union(*[set(df.index) for df in all_data.values()]))

            # Position sizing
            max_position_pct = strategy.max_position_size

            # Run simulation
            for current_date in all_dates:
                engine.current_date = current_date
                prices = {}

                for symbol, df in all_data.items():
                    if current_date not in df.index:
                        continue

                    row = df.loc[current_date]
                    price = row["close"]
                    prices[symbol] = price
                    signal = row.get("signal", 0)

                    if pd.isna(signal):
                        continue

                    portfolio_value = engine.get_portfolio_value(prices)

                    if signal == 1 and symbol not in engine.positions:
                        # Buy signal
                        position_value = portfolio_value * max_position_pct
                        qty = math.floor(position_value / price)
                        if qty > 0:
                            engine.execute_buy(
                                symbol, qty, price,
                                reason=f"{strategy.strategy_type} buy signal"
                            )

                    elif signal == -1 and symbol in engine.positions:
                        # Sell signal
                        qty = engine.positions[symbol]["qty"]
                        engine.execute_sell(
                            symbol, qty, price,
                            reason=f"{strategy.strategy_type} sell signal"
                        )

                    # Check stop loss
                    if symbol in engine.positions and strategy.stop_loss_pct:
                        entry = engine.positions[symbol]["avg_price"]
                        loss_pct = (entry - price) / entry
                        if loss_pct > strategy.stop_loss_pct:
                            qty = engine.positions[symbol]["qty"]
                            engine.execute_sell(symbol, qty, price, reason="stop loss")

                    # Check take profit
                    if symbol in engine.positions and strategy.take_profit_pct:
                        entry = engine.positions[symbol]["avg_price"]
                        gain_pct = (price - entry) / entry
                        if gain_pct > strategy.take_profit_pct:
                            qty = engine.positions[symbol]["qty"]
                            engine.execute_sell(symbol, qty, price, reason="take profit")

                # Record daily equity
                if prices:
                    engine.record_equity(current_date, prices)

            # Calculate final metrics
            metrics = calculate_metrics(
                engine.equity_curve,
                engine.trades,
                backtest.initial_capital,
            )

            # Update backtest with results
            backtest.status = BacktestStatus.COMPLETED.value
            backtest.completed_at = datetime.now(timezone.utc)
            backtest.total_return = metrics.get("total_return")
            backtest.sharpe_ratio = metrics.get("sharpe_ratio")
            backtest.sortino_ratio = metrics.get("sortino_ratio")
            backtest.max_drawdown = metrics.get("max_drawdown")
            backtest.win_rate = metrics.get("win_rate")
            backtest.profit_factor = metrics.get("profit_factor")
            backtest.total_trades = metrics.get("total_trades")
            backtest.final_value = metrics.get("final_value")
            backtest.equity_curve = engine.equity_curve
            backtest.trade_log = engine.trades

        except Exception as e:
            backtest.status = BacktestStatus.FAILED.value
            backtest.error_message = str(e)
            backtest.completed_at = datetime.now(timezone.utc)

        return backtest
