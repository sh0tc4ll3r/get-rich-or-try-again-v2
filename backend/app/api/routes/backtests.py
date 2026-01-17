from fastapi import APIRouter, HTTPException, status

router = APIRouter()


@router.post("/run")
async def run_backtest():
    """Run a backtest for a strategy with given parameters."""
    # TODO: Implement backtesting engine
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Backtesting not yet implemented",
    )


@router.get("/{backtest_id}")
async def get_backtest_results(backtest_id: str):
    """Get results of a completed backtest."""
    # TODO: Return backtest metrics and trade breakdown
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Backtest not found",
    )


@router.get("/")
async def list_backtests():
    """List user's backtest history."""
    return {"backtests": []}
