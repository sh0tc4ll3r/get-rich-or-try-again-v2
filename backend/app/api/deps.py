"""API dependencies for authentication and database access."""

from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models import User
from app.services.user import UserService

security = HTTPBearer()


class ClerkUserInfo(BaseModel):
    """User info extracted from Clerk JWT."""

    clerk_id: str
    email: str
    name: str | None = None


async def get_clerk_jwks() -> dict:
    """Fetch Clerk's JWKS for JWT verification."""
    # Clerk JWKS endpoint format
    jwks_url = f"https://{settings.clerk_publishable_key.split('_')[1]}.clerk.accounts.dev/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        response = await client.get(jwks_url)
        return response.json()


async def verify_clerk_token(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> ClerkUserInfo:
    """Verify Clerk JWT and extract user info.

    For development, we also support a simple token format:
    'dev:<clerk_id>:<email>:<name>' for testing without Clerk.
    """
    token = credentials.credentials

    # Development mode: allow simple dev tokens
    if token.startswith("dev:"):
        parts = token.split(":")
        if len(parts) >= 3:
            return ClerkUserInfo(
                clerk_id=parts[1],
                email=parts[2],
                name=parts[3] if len(parts) > 3 else None,
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid dev token format",
        )

    # Production: verify Clerk JWT
    try:
        # Decode without verification first to get the key ID
        unverified = jwt.get_unverified_header(token)
        kid = unverified.get("kid")

        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing key ID",
            )

        # For now, decode without full JWKS verification
        # In production, you'd fetch JWKS and verify properly
        payload = jwt.decode(
            token,
            settings.clerk_secret_key,
            algorithms=["RS256"],
            options={"verify_signature": False},  # TODO: Enable in production
        )

        return ClerkUserInfo(
            clerk_id=payload.get("sub", ""),
            email=payload.get("email", payload.get("primary_email_address", "")),
            name=payload.get("name", payload.get("first_name", "")),
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )


async def get_current_user(
    clerk_info: Annotated[ClerkUserInfo, Depends(verify_clerk_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Get or create the current user from Clerk token."""
    user_service = UserService(db)
    user = await user_service.get_or_create(
        clerk_id=clerk_info.clerk_id,
        email=clerk_info.email,
        name=clerk_info.name,
    )
    return user


# Type aliases for cleaner route signatures
CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[AsyncSession, Depends(get_db)]
