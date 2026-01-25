"""WebSocket routes for real-time data streaming."""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError

from app.api.deps import verify_clerk_token_raw
from app.services.alpaca import AlpacaService
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections."""

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
        self._user_symbols: dict[str, set[str]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept and store a new connection."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket connected for user {user_id}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove a connection."""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                if user_id in self._user_symbols:
                    del self._user_symbols[user_id]
        logger.info(f"WebSocket disconnected for user {user_id}")

    async def send_to_user(self, user_id: str, message: dict[str, Any]):
        """Send a message to all connections for a user."""
        if user_id in self.active_connections:
            data = json.dumps(message)
            dead_connections = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(data)
                except Exception:
                    dead_connections.append(connection)
            # Clean up dead connections
            for conn in dead_connections:
                self.disconnect(conn, user_id)

    async def broadcast(self, message: dict[str, Any]):
        """Broadcast a message to all connected users."""
        data = json.dumps(message)
        for user_id, connections in list(self.active_connections.items()):
            for connection in connections:
                try:
                    await connection.send_text(data)
                except Exception:
                    self.disconnect(connection, user_id)

    def subscribe_symbols(self, user_id: str, symbols: list[str]):
        """Subscribe a user to symbol updates."""
        if user_id not in self._user_symbols:
            self._user_symbols[user_id] = set()
        self._user_symbols[user_id].update(symbols)

    def get_all_subscribed_symbols(self) -> set[str]:
        """Get all symbols that any user is subscribed to."""
        all_symbols: set[str] = set()
        for symbols in self._user_symbols.values():
            all_symbols.update(symbols)
        return all_symbols

    def get_users_for_symbol(self, symbol: str) -> list[str]:
        """Get all users subscribed to a symbol."""
        return [
            user_id
            for user_id, symbols in self._user_symbols.items()
            if symbol in symbols
        ]


manager = ConnectionManager()


async def verify_clerk_token_raw(token: str) -> dict[str, Any] | None:
    """Verify a Clerk token and return user info."""
    # Support dev tokens for testing
    if token.startswith("dev:"):
        parts = token.split(":")
        if len(parts) >= 3:
            return {
                "sub": parts[1],
                "email": parts[2] if len(parts) > 2 else None,
                "name": parts[3] if len(parts) > 3 else None,
            }
        return None

    # In production, verify JWT
    try:
        from jose import jwt
        # Clerk uses RS256 - in production you'd fetch the JWKS
        # For now, return None to indicate auth needed
        return None
    except JWTError:
        return None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    """WebSocket endpoint for real-time data streaming.

    Connect with: ws://localhost:8000/api/ws?token=<auth_token>

    Messages sent to client:
    - {"type": "quote", "symbol": "AAPL", "data": {...}}
    - {"type": "position", "data": {...}}
    - {"type": "order", "data": {...}}
    - {"type": "execution", "strategy_id": 1, "data": {...}}
    - {"type": "heartbeat", "timestamp": "..."}

    Messages from client:
    - {"action": "subscribe", "symbols": ["AAPL", "GOOGL"]}
    - {"action": "unsubscribe", "symbols": ["AAPL"]}
    """
    # Verify token
    user_info = await verify_clerk_token_raw(token)
    if not user_info:
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = user_info["sub"]
    await manager.connect(websocket, user_id)

    # Start background tasks for this connection
    quote_task = asyncio.create_task(stream_quotes(user_id))
    position_task = asyncio.create_task(stream_positions(user_id))
    heartbeat_task = asyncio.create_task(send_heartbeat(user_id))

    try:
        while True:
            # Receive and handle client messages
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                await handle_client_message(user_id, message)
            except json.JSONDecodeError:
                await manager.send_to_user(user_id, {
                    "type": "error",
                    "message": "Invalid JSON",
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    finally:
        # Cancel background tasks
        quote_task.cancel()
        position_task.cancel()
        heartbeat_task.cancel()
        try:
            await quote_task
        except asyncio.CancelledError:
            pass
        try:
            await position_task
        except asyncio.CancelledError:
            pass
        try:
            await heartbeat_task
        except asyncio.CancelledError:
            pass


async def handle_client_message(user_id: str, message: dict[str, Any]):
    """Handle incoming client messages."""
    action = message.get("action")

    if action == "subscribe":
        symbols = message.get("symbols", [])
        if symbols:
            manager.subscribe_symbols(user_id, symbols)
            await manager.send_to_user(user_id, {
                "type": "subscribed",
                "symbols": symbols,
            })

    elif action == "unsubscribe":
        symbols = message.get("symbols", [])
        if symbols and user_id in manager._user_symbols:
            manager._user_symbols[user_id] -= set(symbols)
            await manager.send_to_user(user_id, {
                "type": "unsubscribed",
                "symbols": symbols,
            })


async def stream_quotes(user_id: str):
    """Stream quote updates for subscribed symbols."""
    alpaca = AlpacaService()

    while True:
        try:
            if user_id not in manager._user_symbols:
                await asyncio.sleep(5)
                continue

            symbols = list(manager._user_symbols[user_id])
            if not symbols:
                await asyncio.sleep(5)
                continue

            # Fetch quotes for all subscribed symbols
            for symbol in symbols:
                try:
                    quote = alpaca.get_latest_quote(symbol)
                    await manager.send_to_user(user_id, {
                        "type": "quote",
                        "symbol": symbol,
                        "data": {
                            "bid_price": str(quote.bid_price),
                            "ask_price": str(quote.ask_price),
                            "bid_size": quote.bid_size,
                            "ask_size": quote.ask_size,
                            "timestamp": quote.timestamp.isoformat(),
                        },
                    })
                except Exception as e:
                    logger.warning(f"Failed to fetch quote for {symbol}: {e}")

            # Poll every 5 seconds (Alpaca rate limits)
            await asyncio.sleep(5)

        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"Error in quote stream: {e}")
            await asyncio.sleep(10)


async def stream_positions(user_id: str):
    """Stream position updates."""
    alpaca = AlpacaService()

    while True:
        try:
            positions = alpaca.get_positions()
            await manager.send_to_user(user_id, {
                "type": "positions",
                "data": [
                    {
                        "symbol": p.symbol,
                        "qty": str(p.qty),
                        "avg_entry_price": str(p.avg_entry_price),
                        "market_value": str(p.market_value),
                        "unrealized_pl": str(p.unrealized_pl),
                        "unrealized_plpc": str(p.unrealized_plpc),
                        "current_price": str(p.current_price),
                        "side": p.side,
                    }
                    for p in positions
                ],
            })

            # Update every 10 seconds
            await asyncio.sleep(10)

        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"Error in position stream: {e}")
            await asyncio.sleep(30)


async def send_heartbeat(user_id: str):
    """Send periodic heartbeat to keep connection alive."""
    while True:
        try:
            await manager.send_to_user(user_id, {
                "type": "heartbeat",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            await asyncio.sleep(30)
        except asyncio.CancelledError:
            raise
        except Exception:
            await asyncio.sleep(30)


# Utility function to broadcast execution updates
async def broadcast_execution(
    user_id: str,
    strategy_id: int,
    signals: list[dict[str, Any]],
):
    """Broadcast strategy execution results to user."""
    await manager.send_to_user(user_id, {
        "type": "execution",
        "strategy_id": strategy_id,
        "signals": signals,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


def get_connection_manager() -> ConnectionManager:
    """Get the global connection manager."""
    return manager
