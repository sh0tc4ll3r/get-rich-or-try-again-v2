"""Strategy management routes."""

from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser, DbSession
from app.services.scheduler import get_scheduler
from app.services.strategy import STRATEGY_TYPES, StrategyService

router = APIRouter()


class StrategyParameterSchema(BaseModel):
    """Schema for strategy parameter definition."""

    name: str
    label: str
    type: str
    default: int | float
    min: int | float | None = None
    max: int | float | None = None


class StrategyTypeSchema(BaseModel):
    """Schema for available strategy type."""

    id: str
    name: str
    description: str
    parameters: list[StrategyParameterSchema]


class StrategyResponse(BaseModel):
    """Response schema for a strategy."""

    id: int
    name: str
    strategy_type: str
    symbols: list[str]
    parameters: dict[str, Any]
    max_position_size: float
    max_daily_loss: float
    stop_loss_pct: float | None
    take_profit_pct: float | None
    status: str
    created_at: str
    deployed_at: str | None

    class Config:
        from_attributes = True


class CreateStrategyRequest(BaseModel):
    """Request to create a new strategy."""

    name: str = Field(..., min_length=1, max_length=255)
    strategy_type: str
    symbols: list[str] = Field(..., min_length=1)
    parameters: dict[str, Any] = Field(default_factory=dict)
    max_position_size: float = Field(default=0.1, ge=0.01, le=1.0)
    max_daily_loss: float = Field(default=0.05, ge=0.01, le=0.5)
    stop_loss_pct: float | None = Field(default=None, ge=0.01, le=0.5)
    take_profit_pct: float | None = Field(default=None, ge=0.01, le=1.0)


class UpdateStrategyRequest(BaseModel):
    """Request to update a strategy."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    symbols: list[str] | None = Field(default=None, min_length=1)
    parameters: dict[str, Any] | None = None
    max_position_size: float | None = Field(default=None, ge=0.01, le=1.0)
    max_daily_loss: float | None = Field(default=None, ge=0.01, le=0.5)
    stop_loss_pct: float | None = Field(default=None, ge=0.01, le=0.5)
    take_profit_pct: float | None = Field(default=None, ge=0.01, le=1.0)


def strategy_to_response(strategy) -> StrategyResponse:
    """Convert a Strategy model to response schema."""
    return StrategyResponse(
        id=strategy.id,
        name=strategy.name,
        strategy_type=strategy.strategy_type,
        symbols=strategy.symbols,
        parameters=strategy.parameters,
        max_position_size=strategy.max_position_size,
        max_daily_loss=strategy.max_daily_loss,
        stop_loss_pct=strategy.stop_loss_pct,
        take_profit_pct=strategy.take_profit_pct,
        status=strategy.status,
        created_at=strategy.created_at.isoformat(),
        deployed_at=strategy.deployed_at.isoformat() if strategy.deployed_at else None,
    )


@router.get("/types", response_model=list[StrategyTypeSchema])
async def list_strategy_types():
    """List all available strategy types with their parameters."""
    return [
        StrategyTypeSchema(
            id=type_id,
            name=type_def["name"],
            description=type_def["description"],
            parameters=[
                StrategyParameterSchema(**param) for param in type_def["parameters"]
            ],
        )
        for type_id, type_def in STRATEGY_TYPES.items()
    ]


@router.get("/", response_model=list[StrategyResponse])
async def list_strategies(user: CurrentUser, db: DbSession):
    """List all strategies for the current user."""
    service = StrategyService(db)
    strategies = await service.list_for_user(user.id)
    return [strategy_to_response(s) for s in strategies]


@router.get("/{strategy_id}", response_model=StrategyResponse)
async def get_strategy(strategy_id: int, user: CurrentUser, db: DbSession):
    """Get details of a specific strategy."""
    service = StrategyService(db)
    strategy = await service.get_by_id(strategy_id, user.id)
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found",
        )
    return strategy_to_response(strategy)


@router.post("/", response_model=StrategyResponse, status_code=status.HTTP_201_CREATED)
async def create_strategy(
    request: CreateStrategyRequest,
    user: CurrentUser,
    db: DbSession,
):
    """Create a new strategy."""
    # Validate strategy type
    if request.strategy_type not in STRATEGY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid strategy type. Must be one of: {list(STRATEGY_TYPES.keys())}",
        )

    # Validate symbols (basic check)
    for symbol in request.symbols:
        if not symbol.isalpha() or len(symbol) > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid symbol: {symbol}",
            )

    service = StrategyService(db)
    strategy = await service.create(
        user_id=user.id,
        name=request.name,
        strategy_type=request.strategy_type,
        symbols=[s.upper() for s in request.symbols],
        parameters=request.parameters,
        max_position_size=request.max_position_size,
        max_daily_loss=request.max_daily_loss,
        stop_loss_pct=request.stop_loss_pct,
        take_profit_pct=request.take_profit_pct,
    )
    return strategy_to_response(strategy)


@router.put("/{strategy_id}", response_model=StrategyResponse)
async def update_strategy(
    strategy_id: int,
    request: UpdateStrategyRequest,
    user: CurrentUser,
    db: DbSession,
):
    """Update an existing strategy."""
    service = StrategyService(db)
    strategy = await service.get_by_id(strategy_id, user.id)
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found",
        )

    # Can't update active strategies
    if strategy.status == "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update an active strategy. Pause or stop it first.",
        )

    # Validate symbols if provided
    if request.symbols:
        for symbol in request.symbols:
            if not symbol.isalpha() or len(symbol) > 5:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid symbol: {symbol}",
                )
        request.symbols = [s.upper() for s in request.symbols]

    await service.update(
        strategy=strategy,
        name=request.name,
        symbols=request.symbols,
        parameters=request.parameters,
        max_position_size=request.max_position_size,
        max_daily_loss=request.max_daily_loss,
        stop_loss_pct=request.stop_loss_pct,
        take_profit_pct=request.take_profit_pct,
    )
    return strategy_to_response(strategy)


@router.delete("/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_strategy(strategy_id: int, user: CurrentUser, db: DbSession):
    """Delete a strategy."""
    service = StrategyService(db)
    strategy = await service.get_by_id(strategy_id, user.id)
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found",
        )

    # Can't delete active strategies
    if strategy.status == "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete an active strategy. Stop it first.",
        )

    await service.delete(strategy)


@router.post("/{strategy_id}/deploy", response_model=StrategyResponse)
async def deploy_strategy(strategy_id: int, user: CurrentUser, db: DbSession):
    """Deploy a strategy to paper trading."""
    service = StrategyService(db)
    strategy = await service.get_by_id(strategy_id, user.id)
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found",
        )

    if strategy.status == "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Strategy is already active",
        )

    # Check if user has Alpaca connected
    if not user.alpaca_connected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please connect your Alpaca account first",
        )

    await service.deploy(strategy)

    # Schedule the strategy for automated execution
    scheduler = get_scheduler()
    await scheduler.schedule_strategy(strategy.id)

    return strategy_to_response(strategy)


@router.post("/{strategy_id}/pause", response_model=StrategyResponse)
async def pause_strategy(strategy_id: int, user: CurrentUser, db: DbSession):
    """Pause an active strategy."""
    service = StrategyService(db)
    strategy = await service.get_by_id(strategy_id, user.id)
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found",
        )

    if strategy.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only pause active strategies",
        )

    await service.pause(strategy)

    # Unschedule the strategy from automated execution
    scheduler = get_scheduler()
    await scheduler.unschedule_strategy(strategy.id)

    return strategy_to_response(strategy)


@router.post("/{strategy_id}/stop", response_model=StrategyResponse)
async def stop_strategy(strategy_id: int, user: CurrentUser, db: DbSession):
    """Stop a strategy."""
    service = StrategyService(db)
    strategy = await service.get_by_id(strategy_id, user.id)
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found",
        )

    if strategy.status not in ["active", "paused"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only stop active or paused strategies",
        )

    await service.stop(strategy)

    # Unschedule the strategy from automated execution
    scheduler = get_scheduler()
    await scheduler.unschedule_strategy(strategy.id)

    return strategy_to_response(strategy)
