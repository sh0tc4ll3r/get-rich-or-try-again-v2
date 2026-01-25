"""Trading and market data API routes."""

from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from app.services.alpaca import AlpacaService, AccountInfo, Position, Quote, Bar

router = APIRouter()


class PlaceOrderRequest(BaseModel):
    """Request to place an order."""

    symbol: str
    qty: Decimal
    side: str  # 'buy' or 'sell'
    order_type: str = "market"  # 'market' or 'limit'
    limit_price: Decimal | None = None
    time_in_force: str = "day"


class PlaceOrderResponse(BaseModel):
    """Response after placing an order."""

    order_id: str
    symbol: str
    side: str
    order_type: str
    qty: Decimal
    status: str


def get_alpaca() -> AlpacaService:
    """Get Alpaca service instance (using default credentials)."""
    return AlpacaService()


@router.get("/account", response_model=AccountInfo)
async def get_account_info():
    """Get trading account information including buying power, equity, etc."""
    try:
        alpaca = get_alpaca()
        return alpaca.get_account()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to connect to Alpaca: {str(e)}",
        )


@router.get("/positions", response_model=list[Position])
async def get_positions():
    """Get all current open positions."""
    try:
        alpaca = get_alpaca()
        return alpaca.get_positions()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch positions: {str(e)}",
        )


@router.get("/positions/{symbol}", response_model=Position)
async def get_position(symbol: str):
    """Get position for a specific symbol."""
    try:
        alpaca = get_alpaca()
        position = alpaca.get_position(symbol.upper())
        if position is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No position found for {symbol}",
            )
        return position
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch position: {str(e)}",
        )


@router.get("/quote/{symbol}", response_model=Quote)
async def get_quote(symbol: str):
    """Get latest quote for a symbol."""
    try:
        alpaca = get_alpaca()
        return alpaca.get_latest_quote(symbol.upper())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch quote: {str(e)}",
        )


@router.get("/bars/{symbol}", response_model=list[Bar])
async def get_bars(
    symbol: str,
    timeframe: str = Query("1Day", description="Bar timeframe: 1Min, 5Min, 15Min, 1Hour, 1Day"),
    start: datetime | None = Query(None, description="Start datetime (ISO format)"),
    end: datetime | None = Query(None, description="End datetime (ISO format)"),
    limit: int = Query(100, ge=1, le=10000, description="Max number of bars"),
):
    """Get historical OHLCV bars for a symbol."""
    try:
        alpaca = get_alpaca()
        return alpaca.get_bars(
            symbol=symbol.upper(),
            timeframe=timeframe,
            start=start,
            end=end,
            limit=limit,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch bars: {str(e)}",
        )


@router.post("/orders", response_model=PlaceOrderResponse)
async def place_order(request: PlaceOrderRequest):
    """Place a new order (paper trading)."""
    try:
        alpaca = get_alpaca()

        if request.order_type == "market":
            result = alpaca.place_market_order(
                symbol=request.symbol.upper(),
                qty=request.qty,
                side=request.side,
                time_in_force=request.time_in_force,
            )
        elif request.order_type == "limit":
            if request.limit_price is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="limit_price is required for limit orders",
                )
            result = alpaca.place_limit_order(
                symbol=request.symbol.upper(),
                qty=request.qty,
                side=request.side,
                limit_price=request.limit_price,
                time_in_force=request.time_in_force,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported order type: {request.order_type}",
            )

        return PlaceOrderResponse(
            order_id=result.order_id,
            symbol=result.symbol,
            side=result.side,
            order_type=result.order_type,
            qty=result.qty,
            status=result.status,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to place order: {str(e)}",
        )


@router.get("/orders/{order_id}")
async def get_order(order_id: str):
    """Get details of a specific order from Alpaca."""
    try:
        alpaca = get_alpaca()
        order = alpaca.get_order(order_id)
        if order is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )
        return order
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch order: {str(e)}",
        )


@router.delete("/orders/{order_id}")
async def cancel_order(order_id: str):
    """Cancel a pending order."""
    try:
        alpaca = get_alpaca()
        success = alpaca.cancel_order(order_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to cancel order",
            )
        return {"status": "cancelled", "order_id": order_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to cancel order: {str(e)}",
        )
