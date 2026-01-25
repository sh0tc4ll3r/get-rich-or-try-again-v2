"""Strategy execution routes."""

from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models import Strategy, StrategyStatus, User
from app.services.executor import execute_strategy_once
from app.services.scheduler import get_scheduler

router = APIRouter()


class SchedulerStatusResponse(BaseModel):
    """Scheduler status response."""

    running: bool
    active_strategies: int
    strategy_ids: list[int]
    next_run: str | None


class ExecutionLogEntry(BaseModel):
    """Execution log entry."""

    strategy_id: int
    status: str
    message: str
    signals: list[dict[str, Any]]
    timestamp: str


class ExecuteResponse(BaseModel):
    """Response from manual strategy execution."""

    strategy_id: int
    strategy_name: str
    signals: list[dict[str, Any]]
    message: str


@router.get("/status", response_model=SchedulerStatusResponse)
async def get_scheduler_status(user: CurrentUser):
    """Get the scheduler status."""
    scheduler = get_scheduler()
    status_info = scheduler.get_status()
    return SchedulerStatusResponse(**status_info)


@router.get("/logs", response_model=list[ExecutionLogEntry])
async def get_execution_logs(
    user: CurrentUser,
    strategy_id: int | None = Query(None, description="Filter by strategy ID"),
    limit: int = Query(50, ge=1, le=200),
):
    """Get recent execution logs."""
    scheduler = get_scheduler()

    # If strategy_id provided, verify user owns it
    # (In production, you'd filter logs by user's strategies only)

    logs = scheduler.get_execution_logs(strategy_id=strategy_id, limit=limit)
    return [ExecutionLogEntry(**log) for log in logs]


@router.post("/{strategy_id}/execute", response_model=ExecuteResponse)
async def execute_strategy_manually(
    strategy_id: int,
    user: CurrentUser,
    db: DbSession,
):
    """Manually trigger strategy execution (for testing)."""
    # Fetch strategy
    result = await db.execute(
        select(Strategy).where(
            Strategy.id == strategy_id,
            Strategy.user_id == user.id,
        )
    )
    strategy = result.scalar_one_or_none()

    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found",
        )

    if strategy.status != StrategyStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only execute active strategies. Deploy the strategy first.",
        )

    # Check Alpaca credentials
    if not user.alpaca_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please connect your Alpaca account first",
        )

    # Execute strategy
    try:
        signals = await execute_strategy_once(db, user, strategy)
        return ExecuteResponse(
            strategy_id=strategy.id,
            strategy_name=strategy.name,
            signals=signals,
            message=f"Executed successfully. Generated {len(signals)} signals.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Execution failed: {str(e)}",
        )
