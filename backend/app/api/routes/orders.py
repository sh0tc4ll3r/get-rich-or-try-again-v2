from fastapi import APIRouter, HTTPException, status

router = APIRouter()


@router.get("/")
async def list_orders():
    """List user's order history."""
    return {"orders": []}


@router.get("/{order_id}")
async def get_order(order_id: str):
    """Get details of a specific order."""
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Order not found",
    )


@router.delete("/{order_id}")
async def cancel_order(order_id: str):
    """Cancel a pending order."""
    # TODO: Implement order cancellation via Alpaca
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Order cancellation not yet implemented",
    )
