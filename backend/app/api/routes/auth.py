"""Authentication routes."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser, DbSession
from app.services.alpaca import AlpacaService
from app.services.user import UserService

router = APIRouter()


class UserProfile(BaseModel):
    """User profile response."""

    id: int
    clerk_id: str
    email: str
    name: str | None
    alpaca_connected: bool
    default_max_position_size: float
    default_max_daily_loss: float
    default_stop_loss_pct: float | None
    default_take_profit_pct: float | None

    class Config:
        from_attributes = True


class UpdateSettingsRequest(BaseModel):
    """Request to update user settings."""

    default_max_position_size: float | None = Field(None, ge=0.01, le=1.0)
    default_max_daily_loss: float | None = Field(None, ge=0.01, le=0.5)
    default_stop_loss_pct: float | None = Field(None, ge=0.01, le=0.5)
    default_take_profit_pct: float | None = Field(None, ge=0.01, le=1.0)


class ConnectAlpacaRequest(BaseModel):
    """Request to connect Alpaca account."""

    api_key: str
    secret_key: str


class ConnectAlpacaResponse(BaseModel):
    """Response after connecting Alpaca."""

    connected: bool
    account_id: str | None = None
    buying_power: str | None = None


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(user: CurrentUser):
    """Get the current authenticated user's profile."""
    return UserProfile(
        id=user.id,
        clerk_id=user.clerk_id,
        email=user.email,
        name=user.name,
        alpaca_connected=user.alpaca_connected,
        default_max_position_size=user.default_max_position_size,
        default_max_daily_loss=user.default_max_daily_loss,
        default_stop_loss_pct=user.default_stop_loss_pct,
        default_take_profit_pct=user.default_take_profit_pct,
    )


@router.put("/settings", response_model=UserProfile)
async def update_user_settings(
    request: UpdateSettingsRequest,
    user: CurrentUser,
    db: DbSession,
):
    """Update user's default settings."""
    user_service = UserService(db)
    await user_service.update_settings(
        user=user,
        default_max_position_size=request.default_max_position_size,
        default_max_daily_loss=request.default_max_daily_loss,
        default_stop_loss_pct=request.default_stop_loss_pct,
        default_take_profit_pct=request.default_take_profit_pct,
    )

    return UserProfile(
        id=user.id,
        clerk_id=user.clerk_id,
        email=user.email,
        name=user.name,
        alpaca_connected=user.alpaca_connected,
        default_max_position_size=user.default_max_position_size,
        default_max_daily_loss=user.default_max_daily_loss,
        default_stop_loss_pct=user.default_stop_loss_pct,
        default_take_profit_pct=user.default_take_profit_pct,
    )


@router.post("/connect-alpaca", response_model=ConnectAlpacaResponse)
async def connect_alpaca_account(
    request: ConnectAlpacaRequest,
    user: CurrentUser,
    db: DbSession,
):
    """Connect user's Alpaca trading account.

    Validates credentials by fetching account info, then stores them.
    """
    # Validate credentials by trying to fetch account
    try:
        alpaca = AlpacaService(
            api_key=request.api_key,
            secret_key=request.secret_key,
        )
        account = alpaca.get_account()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Alpaca credentials: {str(e)}",
        )

    # Store credentials
    user_service = UserService(db)
    await user_service.connect_alpaca(
        user=user,
        api_key=request.api_key,
        secret_key=request.secret_key,
    )

    return ConnectAlpacaResponse(
        connected=True,
        account_id=account.account_id,
        buying_power=str(account.buying_power),
    )


@router.post("/disconnect-alpaca")
async def disconnect_alpaca_account(
    user: CurrentUser,
    db: DbSession,
):
    """Disconnect user's Alpaca trading account."""
    if not user.alpaca_connected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Alpaca account is not connected",
        )

    user_service = UserService(db)
    await user_service.disconnect_alpaca(user)

    return {"disconnected": True}
