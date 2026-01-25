"""User service for managing user data and Clerk sync."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User


class UserService:
    """Service for user-related operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_clerk_id(self, clerk_id: str) -> User | None:
        """Get a user by their Clerk ID."""
        result = await self.db.execute(
            select(User).where(User.clerk_id == clerk_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """Get a user by their email."""
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_or_create(
        self,
        clerk_id: str,
        email: str,
        name: str | None = None,
    ) -> User:
        """Get existing user or create new one from Clerk data."""
        user = await self.get_by_clerk_id(clerk_id)
        if user:
            # Update name if changed
            if name and user.name != name:
                user.name = name
            return user

        # Create new user
        user = User(
            clerk_id=clerk_id,
            email=email,
            name=name,
        )
        self.db.add(user)
        await self.db.flush()
        return user

    async def connect_alpaca(
        self,
        user: User,
        api_key: str,
        secret_key: str,
    ) -> User:
        """Connect Alpaca credentials to user account."""
        user.alpaca_api_key = api_key
        user.alpaca_secret_key = secret_key
        user.alpaca_connected = True
        return user

    async def disconnect_alpaca(self, user: User) -> User:
        """Disconnect Alpaca from user account."""
        user.alpaca_api_key = None
        user.alpaca_secret_key = None
        user.alpaca_connected = False
        return user

    async def update_settings(
        self,
        user: User,
        default_max_position_size: float | None = None,
        default_max_daily_loss: float | None = None,
        default_stop_loss_pct: float | None = None,
        default_take_profit_pct: float | None = None,
    ) -> User:
        """Update user's default risk settings."""
        if default_max_position_size is not None:
            user.default_max_position_size = default_max_position_size
        if default_max_daily_loss is not None:
            user.default_max_daily_loss = default_max_daily_loss
        if default_stop_loss_pct is not None:
            user.default_stop_loss_pct = default_stop_loss_pct
        if default_take_profit_pct is not None:
            user.default_take_profit_pct = default_take_profit_pct
        return user
