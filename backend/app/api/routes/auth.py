from fastapi import APIRouter, Depends, HTTPException, status

router = APIRouter()


@router.get("/me")
async def get_current_user():
    """Get the current authenticated user's profile."""
    # TODO: Implement Clerk auth verification
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Auth not yet implemented",
    )


@router.post("/connect-alpaca")
async def connect_alpaca_account():
    """Connect user's Alpaca trading account."""
    # TODO: Store encrypted Alpaca API keys
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Alpaca connection not yet implemented",
    )
