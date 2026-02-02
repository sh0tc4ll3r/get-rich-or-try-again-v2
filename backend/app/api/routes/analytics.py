"""Analytics API routes for performance data and statistics."""

from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.api.deps import CurrentUser, DbSession
from app.services.analytics import AnalyticsService


router = APIRouter()


class PerformanceMetrics(BaseModel):
    """Performance metrics summary."""

    total_return: float | None
    sharpe_ratio: float | None
    max_drawdown: float | None
    win_rate: float | None
    total_trades: int


class PerformanceResponse(BaseModel):
    """Response schema for performance data."""

    period: str
    dates: list[str]
    equity_values: list[float]
    cumulative_returns: list[float]
    metrics: PerformanceMetrics
    backtest_count: int


class BacktestComparisonInfo(BaseModel):
    """Backtest info for comparison."""

    id: int
    strategy_id: int
    strategy_name: str
    start_date: str
    end_date: str
    total_return: float | None
    sharpe_ratio: float | None
    sortino_ratio: float | None
    max_drawdown: float | None
    win_rate: float | None
    profit_factor: float | None
    total_trades: int | None


class SeriesDataPoint(BaseModel):
    """Single data point in a time series."""

    date: str
    value: float


class ComparisonSeries(BaseModel):
    """Single backtest series for comparison chart."""

    backtest_id: int
    label: str
    data: list[SeriesDataPoint]


class StrategyComparisonResponse(BaseModel):
    """Response schema for strategy comparison."""

    backtests: list[BacktestComparisonInfo]
    series: list[ComparisonSeries]


class TradeStatsResponse(BaseModel):
    """Response schema for trade statistics."""

    total_trades: int
    filled_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float | None
    unique_symbols: int
    total_buy_value: float
    total_sell_value: float
    net_value: float
    by_source: dict[str, int]
    period: str | None


@router.get("/performance", response_model=PerformanceResponse)
async def get_performance(
    user: CurrentUser,
    db: DbSession,
    period: str = Query("30d", description="Time period: 7d, 30d, 90d, 1y, or all"),
    strategy_id: int | None = Query(None, description="Filter by strategy ID"),
) -> PerformanceResponse:
    """
    Get aggregated performance data from completed backtests.

    Returns equity curves, cumulative returns, and key performance metrics.
    """
    service = AnalyticsService(db)
    data = await service.get_performance_data(user.id, period, strategy_id)
    return PerformanceResponse(**data)


@router.get("/strategy-comparison", response_model=StrategyComparisonResponse)
async def compare_strategies(
    user: CurrentUser,
    db: DbSession,
    backtest_ids: str = Query(..., description="Comma-separated backtest IDs to compare (max 4)"),
) -> StrategyComparisonResponse:
    """
    Compare multiple backtests side by side.

    Returns normalized equity curves (starting at 100%) and metrics for each backtest.
    """
    # Parse comma-separated IDs
    try:
        ids = [int(id.strip()) for id in backtest_ids.split(",") if id.strip()]
    except ValueError:
        ids = []

    service = AnalyticsService(db)
    data = await service.compare_strategies(user.id, ids)
    return StrategyComparisonResponse(**data)


@router.get("/trade-stats", response_model=TradeStatsResponse)
async def get_trade_stats(
    user: CurrentUser,
    db: DbSession,
    period: str | None = Query(None, description="Time period: 7d, 30d, 90d, 1y"),
    strategy_id: int | None = Query(None, description="Filter by strategy ID"),
    symbol: str | None = Query(None, description="Filter by symbol"),
) -> TradeStatsResponse:
    """
    Get aggregated trade statistics.

    Returns trade counts, win rate, P&L metrics, and breakdown by source.
    """
    service = AnalyticsService(db)
    data = await service.get_trade_stats(user.id, period, strategy_id, symbol)
    return TradeStatsResponse(**data)
