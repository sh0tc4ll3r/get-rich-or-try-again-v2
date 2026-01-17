from fastapi import APIRouter, HTTPException, status

router = APIRouter()


@router.get("/")
async def list_strategies():
    """List all available trading strategies."""
    # TODO: Implement strategy listing
    return {"strategies": []}


@router.get("/{strategy_id}")
async def get_strategy(strategy_id: str):
    """Get details of a specific strategy including its explanation."""
    # TODO: Implement strategy detail with educational content
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Strategy not found",
    )


@router.post("/{strategy_id}/deploy")
async def deploy_strategy(strategy_id: str):
    """Deploy a strategy to paper or live trading."""
    # TODO: Implement strategy deployment with risk checks
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Strategy deployment not yet implemented",
    )
