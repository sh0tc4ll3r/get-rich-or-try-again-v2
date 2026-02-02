"""Alpaca Trading API integration service."""

from datetime import datetime
from decimal import Decimal
from typing import Any

from alpaca.data import StockHistoricalDataClient
from alpaca.data.enums import DataFeed
from alpaca.data.requests import StockBarsRequest, StockLatestQuoteRequest
from alpaca.data.timeframe import TimeFrame
from alpaca.trading.client import TradingClient
from alpaca.trading.enums import OrderSide, OrderType, TimeInForce
from alpaca.trading.requests import MarketOrderRequest, LimitOrderRequest
from pydantic import BaseModel

from app.core.config import settings


class AccountInfo(BaseModel):
    """Account summary information."""

    account_id: str
    buying_power: Decimal
    cash: Decimal
    portfolio_value: Decimal
    equity: Decimal
    last_equity: Decimal
    currency: str
    status: str
    trading_blocked: bool
    pattern_day_trader: bool


class Position(BaseModel):
    """Current position in a symbol."""

    symbol: str
    qty: Decimal
    avg_entry_price: Decimal
    market_value: Decimal
    unrealized_pl: Decimal
    unrealized_plpc: Decimal
    current_price: Decimal
    side: str


class Quote(BaseModel):
    """Latest quote for a symbol."""

    symbol: str
    bid_price: Decimal
    ask_price: Decimal
    bid_size: int
    ask_size: int
    timestamp: datetime


class Bar(BaseModel):
    """OHLCV bar data."""

    timestamp: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: int
    vwap: Decimal | None = None


class OrderResult(BaseModel):
    """Result of an order submission."""

    order_id: str
    client_order_id: str
    symbol: str
    side: str
    order_type: str
    qty: Decimal
    status: str
    created_at: datetime


class AlpacaService:
    """Service for interacting with Alpaca Trading API."""

    def __init__(
        self,
        api_key: str | None = None,
        secret_key: str | None = None,
        paper: bool = True,
    ):
        """Initialize Alpaca clients.

        Args:
            api_key: Alpaca API key (uses settings if not provided)
            secret_key: Alpaca secret key (uses settings if not provided)
            paper: Whether to use paper trading (default: True)
        """
        self.api_key = api_key or settings.alpaca_api_key
        self.secret_key = secret_key or settings.alpaca_secret_key
        self.paper = paper

        # Initialize trading client
        self._trading_client: TradingClient | None = None
        self._data_client: StockHistoricalDataClient | None = None

    @property
    def trading_client(self) -> TradingClient:
        """Lazy-load trading client."""
        if self._trading_client is None:
            self._trading_client = TradingClient(
                api_key=self.api_key,
                secret_key=self.secret_key,
                paper=self.paper,
            )
        return self._trading_client

    @property
    def data_client(self) -> StockHistoricalDataClient:
        """Lazy-load data client."""
        if self._data_client is None:
            self._data_client = StockHistoricalDataClient(
                api_key=self.api_key,
                secret_key=self.secret_key,
            )
        return self._data_client

    def get_account(self) -> AccountInfo:
        """Get account information."""
        account = self.trading_client.get_account()
        return AccountInfo(
            account_id=str(account.id),
            buying_power=Decimal(str(account.buying_power)),
            cash=Decimal(str(account.cash)),
            portfolio_value=Decimal(str(account.portfolio_value)),
            equity=Decimal(str(account.equity)),
            last_equity=Decimal(str(account.last_equity)),
            currency=account.currency,
            status=account.status.value if account.status else "unknown",
            trading_blocked=account.trading_blocked,
            pattern_day_trader=account.pattern_day_trader,
        )

    def get_positions(self) -> list[Position]:
        """Get all current positions."""
        positions = self.trading_client.get_all_positions()
        return [
            Position(
                symbol=pos.symbol,
                qty=Decimal(str(pos.qty)),
                avg_entry_price=Decimal(str(pos.avg_entry_price)),
                market_value=Decimal(str(pos.market_value)),
                unrealized_pl=Decimal(str(pos.unrealized_pl)),
                unrealized_plpc=Decimal(str(pos.unrealized_plpc)),
                current_price=Decimal(str(pos.current_price)),
                side=pos.side.value if pos.side else "long",
            )
            for pos in positions
        ]

    def get_position(self, symbol: str) -> Position | None:
        """Get position for a specific symbol."""
        try:
            pos = self.trading_client.get_open_position(symbol)
            return Position(
                symbol=pos.symbol,
                qty=Decimal(str(pos.qty)),
                avg_entry_price=Decimal(str(pos.avg_entry_price)),
                market_value=Decimal(str(pos.market_value)),
                unrealized_pl=Decimal(str(pos.unrealized_pl)),
                unrealized_plpc=Decimal(str(pos.unrealized_plpc)),
                current_price=Decimal(str(pos.current_price)),
                side=pos.side.value if pos.side else "long",
            )
        except Exception:
            return None

    def get_latest_quote(self, symbol: str) -> Quote:
        """Get latest quote for a symbol."""
        request = StockLatestQuoteRequest(symbol_or_symbols=symbol, feed=DataFeed.IEX)
        quotes = self.data_client.get_stock_latest_quote(request)
        quote = quotes[symbol]
        return Quote(
            symbol=symbol,
            bid_price=Decimal(str(quote.bid_price)),
            ask_price=Decimal(str(quote.ask_price)),
            bid_size=quote.bid_size,
            ask_size=quote.ask_size,
            timestamp=quote.timestamp,
        )

    def get_bars(
        self,
        symbol: str,
        timeframe: str = "1Day",
        start: datetime | None = None,
        end: datetime | None = None,
        limit: int = 100,
    ) -> list[Bar]:
        """Get historical bars for a symbol.

        Args:
            symbol: Stock symbol
            timeframe: Bar timeframe ('1Min', '5Min', '15Min', '1Hour', '1Day')
            start: Start datetime
            end: End datetime
            limit: Max bars to return
        """
        tf_map = {
            "1Min": TimeFrame.Minute,
            "5Min": TimeFrame(5, "Min"),
            "15Min": TimeFrame(15, "Min"),
            "1Hour": TimeFrame.Hour,
            "1Day": TimeFrame.Day,
        }
        tf = tf_map.get(timeframe, TimeFrame.Day)

        request = StockBarsRequest(
            symbol_or_symbols=symbol,
            timeframe=tf,
            start=start,
            end=end,
            limit=limit,
            feed=DataFeed.IEX,  # Use IEX feed (free tier) instead of SIP (paid)
        )
        bars = self.data_client.get_stock_bars(request)
        return [
            Bar(
                timestamp=bar.timestamp,
                open=Decimal(str(bar.open)),
                high=Decimal(str(bar.high)),
                low=Decimal(str(bar.low)),
                close=Decimal(str(bar.close)),
                volume=bar.volume,
                vwap=Decimal(str(bar.vwap)) if bar.vwap else None,
            )
            for bar in bars[symbol]
        ]

    def place_market_order(
        self,
        symbol: str,
        qty: Decimal,
        side: str,
        time_in_force: str = "day",
    ) -> OrderResult:
        """Place a market order.

        Args:
            symbol: Stock symbol
            qty: Number of shares
            side: 'buy' or 'sell'
            time_in_force: 'day', 'gtc', 'ioc', 'fok'
        """
        tif_map = {
            "day": TimeInForce.DAY,
            "gtc": TimeInForce.GTC,
            "ioc": TimeInForce.IOC,
            "fok": TimeInForce.FOK,
        }
        request = MarketOrderRequest(
            symbol=symbol,
            qty=float(qty),
            side=OrderSide.BUY if side.lower() == "buy" else OrderSide.SELL,
            time_in_force=tif_map.get(time_in_force, TimeInForce.DAY),
        )
        order = self.trading_client.submit_order(request)
        return OrderResult(
            order_id=str(order.id),
            client_order_id=str(order.client_order_id),
            symbol=order.symbol,
            side=order.side.value,
            order_type=order.order_type.value,
            qty=Decimal(str(order.qty)),
            status=order.status.value,
            created_at=order.created_at,
        )

    def place_limit_order(
        self,
        symbol: str,
        qty: Decimal,
        side: str,
        limit_price: Decimal,
        time_in_force: str = "day",
    ) -> OrderResult:
        """Place a limit order.

        Args:
            symbol: Stock symbol
            qty: Number of shares
            side: 'buy' or 'sell'
            limit_price: Limit price
            time_in_force: 'day', 'gtc', 'ioc', 'fok'
        """
        tif_map = {
            "day": TimeInForce.DAY,
            "gtc": TimeInForce.GTC,
            "ioc": TimeInForce.IOC,
            "fok": TimeInForce.FOK,
        }
        request = LimitOrderRequest(
            symbol=symbol,
            qty=float(qty),
            side=OrderSide.BUY if side.lower() == "buy" else OrderSide.SELL,
            limit_price=float(limit_price),
            time_in_force=tif_map.get(time_in_force, TimeInForce.DAY),
        )
        order = self.trading_client.submit_order(request)
        return OrderResult(
            order_id=str(order.id),
            client_order_id=str(order.client_order_id),
            symbol=order.symbol,
            side=order.side.value,
            order_type=order.order_type.value,
            qty=Decimal(str(order.qty)),
            status=order.status.value,
            created_at=order.created_at,
        )

    def cancel_order(self, order_id: str) -> bool:
        """Cancel an order by ID."""
        try:
            self.trading_client.cancel_order_by_id(order_id)
            return True
        except Exception:
            return False

    def get_order(self, order_id: str) -> dict[str, Any] | None:
        """Get order details by ID."""
        try:
            order = self.trading_client.get_order_by_id(order_id)
            return {
                "order_id": str(order.id),
                "client_order_id": str(order.client_order_id),
                "symbol": order.symbol,
                "side": order.side.value,
                "order_type": order.order_type.value,
                "qty": str(order.qty),
                "filled_qty": str(order.filled_qty) if order.filled_qty else "0",
                "filled_avg_price": str(order.filled_avg_price) if order.filled_avg_price else None,
                "status": order.status.value,
                "created_at": order.created_at.isoformat(),
                "filled_at": order.filled_at.isoformat() if order.filled_at else None,
            }
        except Exception:
            return None


def get_alpaca_service(
    api_key: str | None = None,
    secret_key: str | None = None,
) -> AlpacaService:
    """Factory function to create an Alpaca service instance."""
    return AlpacaService(api_key=api_key, secret_key=secret_key)
