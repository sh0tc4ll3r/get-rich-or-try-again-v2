"""Backtest management routes."""

from datetime import date
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser, DbSession
from app.services.alpaca import AlpacaService
from app.services.backtest import BacktestService
from app.services.strategy import StrategyService

router = APIRouter()


class BacktestResponse(BaseModel):
    """Response schema for a backtest."""

    id: int
    strategy_id: int
    strategy_name: str | None = None
    start_date: str
    end_date: str
    initial_capital: float
    status: str
    error_message: str | None = None

    # Results (populated when completed)
    total_return: float | None = None
    sharpe_ratio: float | None = None
    sortino_ratio: float | None = None
    max_drawdown: float | None = None
    win_rate: float | None = None
    profit_factor: float | None = None
    total_trades: int | None = None
    final_value: float | None = None

    created_at: str
    started_at: str | None = None
    completed_at: str | None = None


class BacktestDetailResponse(BacktestResponse):
    """Detailed backtest response with equity curve and trades."""

    equity_curve: list[dict[str, Any]] | None = None
    trade_log: list[dict[str, Any]] | None = None
    parameters_snapshot: dict[str, Any] | None = None


class RunBacktestRequest(BaseModel):
    """Request to run a backtest."""

    strategy_id: int
    start_date: date
    end_date: date
    initial_capital: float = Field(default=100000.0, ge=1000, le=10000000)


def backtest_to_response(
    backtest,
    strategy_name: str | None = None,
    include_details: bool = False,
) -> BacktestResponse | BacktestDetailResponse:
    """Convert a Backtest model to response schema."""
    data = {
        "id": backtest.id,
        "strategy_id": backtest.strategy_id,
        "strategy_name": strategy_name,
        "start_date": backtest.start_date.isoformat(),
        "end_date": backtest.end_date.isoformat(),
        "initial_capital": backtest.initial_capital,
        "status": backtest.status,
        "error_message": backtest.error_message,
        "total_return": backtest.total_return,
        "sharpe_ratio": backtest.sharpe_ratio,
        "sortino_ratio": backtest.sortino_ratio,
        "max_drawdown": backtest.max_drawdown,
        "win_rate": backtest.win_rate,
        "profit_factor": backtest.profit_factor,
        "total_trades": backtest.total_trades,
        "final_value": backtest.final_value,
        "created_at": backtest.created_at.isoformat(),
        "started_at": backtest.started_at.isoformat() if backtest.started_at else None,
        "completed_at": backtest.completed_at.isoformat() if backtest.completed_at else None,
    }

    if include_details:
        data["equity_curve"] = backtest.equity_curve
        data["trade_log"] = backtest.trade_log
        data["parameters_snapshot"] = backtest.parameters_snapshot
        return BacktestDetailResponse(**data)

    return BacktestResponse(**data)


@router.get("/", response_model=list[BacktestResponse])
async def list_backtests(
    user: CurrentUser,
    db: DbSession,
    strategy_id: int | None = Query(None, description="Filter by strategy ID"),
    limit: int = Query(50, ge=1, le=100),
):
    """List user's backtest history."""
    backtest_service = BacktestService(db)
    strategy_service = StrategyService(db)

    if strategy_id:
        backtests = await backtest_service.list_for_strategy(strategy_id, user.id)
    else:
        backtests = await backtest_service.list_for_user(user.id, limit=limit)

    # Get strategy names
    result = []
    for bt in backtests:
        strategy = await strategy_service.get_by_id(bt.strategy_id, user.id)
        strategy_name = strategy.name if strategy else None
        result.append(backtest_to_response(bt, strategy_name))

    return result


@router.get("/{backtest_id}", response_model=BacktestDetailResponse)
async def get_backtest(backtest_id: int, user: CurrentUser, db: DbSession):
    """Get detailed results of a backtest."""
    backtest_service = BacktestService(db)
    strategy_service = StrategyService(db)

    backtest = await backtest_service.get_by_id(backtest_id, user.id)
    if not backtest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest not found",
        )

    strategy = await strategy_service.get_by_id(backtest.strategy_id, user.id)
    strategy_name = strategy.name if strategy else None

    return backtest_to_response(backtest, strategy_name, include_details=True)


@router.post("/", response_model=BacktestResponse, status_code=status.HTTP_202_ACCEPTED)
async def run_backtest(
    request: RunBacktestRequest,
    user: CurrentUser,
    db: DbSession,
    background_tasks: BackgroundTasks,
):
    """Run a backtest for a strategy.

    The backtest runs asynchronously. Poll the GET endpoint to check status.
    """
    strategy_service = StrategyService(db)
    backtest_service = BacktestService(db)

    # Validate strategy exists
    strategy = await strategy_service.get_by_id(request.strategy_id, user.id)
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found",
        )

    # Validate date range
    if request.start_date >= request.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be before end date",
        )

    if (request.end_date - request.start_date).days > 365 * 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum backtest period is 5 years",
        )

    # Create backtest record
    backtest = await backtest_service.create(
        user_id=user.id,
        strategy=strategy,
        start_date=request.start_date,
        end_date=request.end_date,
        initial_capital=request.initial_capital,
    )

    # Run backtest (synchronously for now - could be async with Celery later)
    alpaca = AlpacaService()
    await backtest_service.run(backtest, strategy, alpaca)

    return backtest_to_response(backtest, strategy.name)


@router.delete("/{backtest_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_backtest(backtest_id: int, user: CurrentUser, db: DbSession):
    """Delete a backtest."""
    backtest_service = BacktestService(db)

    backtest = await backtest_service.get_by_id(backtest_id, user.id)
    if not backtest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest not found",
        )

    await db.delete(backtest)
