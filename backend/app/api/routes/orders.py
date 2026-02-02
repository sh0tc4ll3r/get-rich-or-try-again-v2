"""Order/trade history routes."""

from decimal import Decimal
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from app.api.deps import CurrentUser, DbSession
from app.services.trade import TradeService

router = APIRouter()


class TradeResponse(BaseModel):
    """Response schema for a trade."""

    id: int
    strategy_id: int | None
    broker_order_id: str | None
    symbol: str
    side: str
    order_type: str
    quantity: str
    limit_price: str | None
    stop_price: str | None
    filled_quantity: str
    filled_avg_price: str | None
    commission: str
    status: str
    source: str
    signal_reason: str | None
    notes: str | None
    notes_updated_at: str | None
    created_at: str
    submitted_at: str | None
    filled_at: str | None


class UpdateNotesRequest(BaseModel):
    """Request schema for updating trade notes."""

    notes: str | None


def trade_to_response(trade) -> TradeResponse:
    """Convert a Trade model to response schema."""
    return TradeResponse(
        id=trade.id,
        strategy_id=trade.strategy_id,
        broker_order_id=trade.broker_order_id,
        symbol=trade.symbol,
        side=trade.side,
        order_type=trade.order_type,
        quantity=str(trade.quantity),
        limit_price=str(trade.limit_price) if trade.limit_price else None,
        stop_price=str(trade.stop_price) if trade.stop_price else None,
        filled_quantity=str(trade.filled_quantity),
        filled_avg_price=str(trade.filled_avg_price) if trade.filled_avg_price else None,
        commission=str(trade.commission),
        status=trade.status,
        source=trade.source,
        signal_reason=trade.signal_reason,
        notes=trade.notes,
        notes_updated_at=trade.notes_updated_at.isoformat() if trade.notes_updated_at else None,
        created_at=trade.created_at.isoformat(),
        submitted_at=trade.submitted_at.isoformat() if trade.submitted_at else None,
        filled_at=trade.filled_at.isoformat() if trade.filled_at else None,
    )


@router.get("/", response_model=list[TradeResponse])
async def list_trades(
    user: CurrentUser,
    db: DbSession,
    source: str | None = Query(None, description="Filter by source: paper, backtest, manual"),
    limit: int = Query(50, ge=1, le=100),
):
    """List user's trade/order history."""
    service = TradeService(db)
    trades = await service.list_for_user(user.id, limit=limit, source=source)
    return [trade_to_response(t) for t in trades]


@router.get("/{trade_id}", response_model=TradeResponse)
async def get_trade(trade_id: int, user: CurrentUser, db: DbSession):
    """Get details of a specific trade."""
    service = TradeService(db)
    trade = await service.get_by_id(trade_id, user.id)
    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade not found",
        )
    return trade_to_response(trade)


@router.delete("/{trade_id}")
async def cancel_trade(trade_id: int, user: CurrentUser, db: DbSession):
    """Cancel a pending trade."""
    service = TradeService(db)
    trade = await service.get_by_id(trade_id, user.id)

    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade not found",
        )

    if trade.status not in ["pending", "partial"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel trade with status: {trade.status}",
        )

    await service.cancel(trade)
    return {"status": "cancelled", "trade_id": trade_id}


@router.put("/{trade_id}/notes", response_model=TradeResponse)
async def update_trade_notes(
    trade_id: int,
    request: UpdateNotesRequest,
    user: CurrentUser,
    db: DbSession,
):
    """Update notes for a trade."""
    service = TradeService(db)
    trade = await service.get_by_id(trade_id, user.id)

    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade not found",
        )

    await service.update_notes(trade, request.notes)
    await db.commit()
    return trade_to_response(trade)
