"""Analytics service for performance data and statistics."""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Backtest, Trade, BacktestStatus, OrderStatus
from app.models.strategy import Strategy


class AnalyticsService:
    """Service for analytics and performance metrics."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_performance_data(
        self,
        user_id: int,
        period: str = "30d",
        strategy_id: int | None = None,
    ) -> dict:
        """
        Get aggregated performance data from completed backtests.

        Args:
            user_id: User ID to filter by
            period: Time period - 7d, 30d, 90d, 1y, or all
            strategy_id: Optional strategy ID to filter by

        Returns:
            Dict with dates, equity values, cumulative returns, and metrics
        """
        # Calculate date range
        end_date = date.today()
        if period == "7d":
            start_date = end_date - timedelta(days=7)
        elif period == "30d":
            start_date = end_date - timedelta(days=30)
        elif period == "90d":
            start_date = end_date - timedelta(days=90)
        elif period == "1y":
            start_date = end_date - timedelta(days=365)
        else:  # "all"
            start_date = None

        # Build query for completed backtests
        query = select(Backtest).where(
            Backtest.user_id == user_id,
            Backtest.status == BacktestStatus.COMPLETED.value,
        )

        if strategy_id is not None:
            query = query.where(Backtest.strategy_id == strategy_id)

        if start_date is not None:
            query = query.where(Backtest.completed_at >= datetime.combine(start_date, datetime.min.time()))

        query = query.order_by(Backtest.completed_at.desc())

        result = await self.db.execute(query)
        backtests = list(result.scalars().all())

        if not backtests:
            return {
                "period": period,
                "dates": [],
                "equity_values": [],
                "cumulative_returns": [],
                "metrics": {
                    "total_return": None,
                    "sharpe_ratio": None,
                    "max_drawdown": None,
                    "win_rate": None,
                    "total_trades": 0,
                },
            }

        # Aggregate equity curves from all backtests
        all_equity_points = []
        for bt in backtests:
            if bt.equity_curve:
                for point in bt.equity_curve:
                    all_equity_points.append({
                        "date": point["date"],
                        "equity": point["equity"],
                        "backtest_id": bt.id,
                        "initial_capital": bt.initial_capital,
                    })

        # Sort by date and aggregate
        all_equity_points.sort(key=lambda x: x["date"])

        # Calculate aggregate metrics from the most recent backtests
        total_return = sum(bt.total_return or 0 for bt in backtests) / len(backtests) if backtests else None
        sharpe_ratios = [bt.sharpe_ratio for bt in backtests if bt.sharpe_ratio is not None]
        avg_sharpe = sum(sharpe_ratios) / len(sharpe_ratios) if sharpe_ratios else None
        max_drawdowns = [bt.max_drawdown for bt in backtests if bt.max_drawdown is not None]
        worst_drawdown = max(max_drawdowns) if max_drawdowns else None
        win_rates = [bt.win_rate for bt in backtests if bt.win_rate is not None]
        avg_win_rate = sum(win_rates) / len(win_rates) if win_rates else None
        total_trades = sum(bt.total_trades or 0 for bt in backtests)

        # Extract dates and values for the response
        dates = list(dict.fromkeys(p["date"] for p in all_equity_points))

        # Get latest equity value per date
        equity_by_date = {}
        for p in all_equity_points:
            equity_by_date[p["date"]] = p["equity"]
        equity_values = [equity_by_date.get(d, 0) for d in dates]

        # Calculate cumulative returns (normalized to first value)
        if equity_values and equity_values[0] > 0:
            cumulative_returns = [(v / equity_values[0] - 1) * 100 for v in equity_values]
        else:
            cumulative_returns = [0] * len(equity_values)

        return {
            "period": period,
            "dates": dates,
            "equity_values": equity_values,
            "cumulative_returns": cumulative_returns,
            "metrics": {
                "total_return": total_return,
                "sharpe_ratio": avg_sharpe,
                "max_drawdown": worst_drawdown,
                "win_rate": avg_win_rate,
                "total_trades": total_trades,
            },
            "backtest_count": len(backtests),
        }

    async def compare_strategies(
        self,
        user_id: int,
        backtest_ids: list[int],
    ) -> dict:
        """
        Compare multiple backtests by normalizing their equity curves.

        Args:
            user_id: User ID to filter by
            backtest_ids: List of backtest IDs to compare (max 4)

        Returns:
            Dict with comparison data and metrics per backtest
        """
        if len(backtest_ids) > 4:
            backtest_ids = backtest_ids[:4]

        # Fetch the backtests with strategy relationship
        query = (
            select(Backtest)
            .options(selectinload(Backtest.strategy))
            .where(
                Backtest.user_id == user_id,
                Backtest.id.in_(backtest_ids),
                Backtest.status == BacktestStatus.COMPLETED.value,
            )
        )
        result = await self.db.execute(query)
        backtests = list(result.scalars().all())

        if not backtests:
            return {
                "backtests": [],
                "series": [],
            }

        series = []
        backtest_info = []

        for bt in backtests:
            # Get strategy name
            strategy_name = bt.strategy.name if bt.strategy else f"Backtest {bt.id}"

            info = {
                "id": bt.id,
                "strategy_id": bt.strategy_id,
                "strategy_name": strategy_name,
                "start_date": bt.start_date.isoformat(),
                "end_date": bt.end_date.isoformat(),
                "total_return": bt.total_return,
                "sharpe_ratio": bt.sharpe_ratio,
                "sortino_ratio": bt.sortino_ratio,
                "max_drawdown": bt.max_drawdown,
                "win_rate": bt.win_rate,
                "profit_factor": bt.profit_factor,
                "total_trades": bt.total_trades,
            }
            backtest_info.append(info)

            # Normalize equity curve to 100% start
            if bt.equity_curve:
                initial_equity = bt.equity_curve[0]["equity"] if bt.equity_curve else 100000
                normalized_curve = []
                for point in bt.equity_curve:
                    normalized_value = (point["equity"] / initial_equity) * 100
                    normalized_curve.append({
                        "date": point["date"],
                        "value": normalized_value,
                    })
                series.append({
                    "backtest_id": bt.id,
                    "label": strategy_name,
                    "data": normalized_curve,
                })

        return {
            "backtests": backtest_info,
            "series": series,
        }

    async def get_trade_stats(
        self,
        user_id: int,
        period: str | None = None,
        strategy_id: int | None = None,
        symbol: str | None = None,
    ) -> dict:
        """
        Get aggregated trade statistics.

        Args:
            user_id: User ID to filter by
            period: Optional time period - 7d, 30d, 90d, 1y
            strategy_id: Optional strategy ID to filter by
            symbol: Optional symbol to filter by

        Returns:
            Dict with trade statistics
        """
        # Build base query conditions
        conditions = [Trade.user_id == user_id]

        # Apply time period filter
        if period:
            end_date = datetime.now(timezone.utc)
            if period == "7d":
                start_date = end_date - timedelta(days=7)
            elif period == "30d":
                start_date = end_date - timedelta(days=30)
            elif period == "90d":
                start_date = end_date - timedelta(days=90)
            elif period == "1y":
                start_date = end_date - timedelta(days=365)
            else:
                start_date = None

            if start_date:
                conditions.append(Trade.created_at >= start_date)

        if strategy_id is not None:
            conditions.append(Trade.strategy_id == strategy_id)

        if symbol:
            conditions.append(Trade.symbol == symbol.upper())

        # Get filled trades only for P&L calculations
        filled_conditions = conditions + [Trade.status == OrderStatus.FILLED.value]

        # Count total trades
        total_query = select(func.count(Trade.id)).where(and_(*conditions))
        total_result = await self.db.execute(total_query)
        total_trades = total_result.scalar() or 0

        # Count filled trades
        filled_count_query = select(func.count(Trade.id)).where(and_(*filled_conditions))
        filled_result = await self.db.execute(filled_count_query)
        filled_trades = filled_result.scalar() or 0

        # Get all filled trades for P&L analysis
        trades_query = select(Trade).where(and_(*filled_conditions))
        trades_result = await self.db.execute(trades_query)
        trades = list(trades_result.scalars().all())

        # Calculate P&L metrics
        # Note: For proper P&L we'd need to match buy/sell pairs
        # This is a simplified version based on trade value
        total_buy_value = Decimal("0")
        total_sell_value = Decimal("0")
        winning_trades = 0
        losing_trades = 0

        buy_positions: dict[str, list[tuple[Decimal, Decimal]]] = {}  # symbol -> [(qty, price)]

        for trade in sorted(trades, key=lambda t: t.created_at or datetime.min):
            if trade.filled_avg_price is None or trade.filled_quantity is None:
                continue

            qty = trade.filled_quantity
            price = trade.filled_avg_price
            value = qty * price

            if trade.side == "buy":
                total_buy_value += value
                if trade.symbol not in buy_positions:
                    buy_positions[trade.symbol] = []
                buy_positions[trade.symbol].append((qty, price))
            else:  # sell
                total_sell_value += value
                # Calculate P&L against FIFO buy
                if trade.symbol in buy_positions and buy_positions[trade.symbol]:
                    buy_qty, buy_price = buy_positions[trade.symbol][0]
                    if qty <= buy_qty:
                        pnl = (price - buy_price) * qty
                        if pnl >= 0:
                            winning_trades += 1
                        else:
                            losing_trades += 1
                        remaining_qty = buy_qty - qty
                        if remaining_qty > 0:
                            buy_positions[trade.symbol][0] = (remaining_qty, buy_price)
                        else:
                            buy_positions[trade.symbol].pop(0)

        total_closed_trades = winning_trades + losing_trades
        win_rate = (winning_trades / total_closed_trades * 100) if total_closed_trades > 0 else None

        # Get unique symbols traded
        symbols_query = select(func.count(func.distinct(Trade.symbol))).where(and_(*conditions))
        symbols_result = await self.db.execute(symbols_query)
        unique_symbols = symbols_result.scalar() or 0

        # Get trade breakdown by source
        source_query = (
            select(Trade.source, func.count(Trade.id))
            .where(and_(*conditions))
            .group_by(Trade.source)
        )
        source_result = await self.db.execute(source_query)
        by_source = dict(source_result.all())

        return {
            "total_trades": total_trades,
            "filled_trades": filled_trades,
            "winning_trades": winning_trades,
            "losing_trades": losing_trades,
            "win_rate": win_rate,
            "unique_symbols": unique_symbols,
            "total_buy_value": float(total_buy_value),
            "total_sell_value": float(total_sell_value),
            "net_value": float(total_sell_value - total_buy_value),
            "by_source": by_source,
            "period": period,
        }
