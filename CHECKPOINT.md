# Get Rich or Try Again - Project Checkpoint

**Last Updated:** 2026-03-06

## Current State

### Completed
- [x] Docker setup (Postgres + Redis via docker-compose.yml)
- [x] Backend skeleton (FastAPI with routes for auth, strategies, backtests, orders)
- [x] Frontend initialized (Next.js 14 + TypeScript + Tailwind)
- [x] shadcn/ui components (button, card, input)
- [x] Clerk authentication integrated (Google sign-in working)
- [x] Protected routes via middleware
- [x] Dashboard shell page with nav bar
- [x] **Database Models** (2026-01-25)
  - User model (synced with Clerk, Alpaca credentials)
  - Strategy model (type, symbols, parameters, risk settings, status)
  - Backtest model (configuration, results, metrics, equity curve)
  - Trade model (orders, fills, broker integration)
- [x] **Database Infrastructure** (2026-01-25)
  - Async SQLAlchemy setup (`app/core/database.py`)
  - Alembic migrations configured
  - Initial migration created (`001_initial_models.py`)
  - FastAPI lifespan events for DB lifecycle
- [x] **Alpaca Integration** (2026-01-25)
  - AlpacaService class (`app/services/alpaca.py`)
  - Account info and positions endpoints
  - Market data (quotes, historical bars)
  - Order placement (market, limit) and cancellation
  - User auth with Clerk JWT verification
  - Alpaca credential connection flow
- [x] **Strategy Builder UI** (2026-01-25)
  - StrategyService for CRUD operations
  - Full REST API for strategies
  - Strategy types with configurable parameters
  - Frontend strategy list and builder pages
- [x] **Backtesting Engine** (2026-01-25)
  - BacktestEngine class with simulation logic
  - StrategyExecutor with 4 strategy implementations:
    - Momentum (price momentum threshold)
    - Mean Reversion (SMA deviation)
    - RSI (overbought/oversold levels)
    - Breakout (price breakout detection)
  - Performance metrics: Sharpe ratio, Sortino ratio, max drawdown, win rate, profit factor
  - Stop loss and take profit execution
  - Full API for running and viewing backtests
  - Frontend UI with:
    - Backtest list with status and key metrics
    - Run backtest modal
    - Detail page with equity curve chart (lightweight-charts)
    - Trade log table
- [x] **Real-time Dashboard** (2026-01-25)
  - TradeService for managing trade records
  - Orders API with list, get, cancel endpoints
  - Main dashboard page with:
    - Portfolio value, daily P&L, active strategies, positions count cards
    - Portfolio performance chart (30-day area chart with lightweight-charts)
    - Open positions list with unrealized P&L
    - Recent trades list with status badges
    - Quick action buttons (Create Strategy, Run Backtest, View Strategies)
    - Auto-refresh capability
  - Dedicated trades page (`/dashboard/trades`):
    - Trade summary cards (total, buy, sell counts)
    - Source filter (All, Paper, Backtest, Manual, Strategy)
    - Full trades table with symbol, side, type, qty, price, status, source, date
    - Cancel pending orders functionality
- [x] **Strategy Execution** (2026-01-25)
  - APScheduler integration for background tasks
  - SchedulerService (`app/services/scheduler.py`):
    - Runs every 5 minutes during market hours (Mon-Fri 9am-4pm ET)
    - Loads active strategies on startup
    - Manages scheduled/unscheduled strategies
    - Execution logging with in-memory log buffer
  - StrategyRunner (`app/services/executor.py`):
    - Fetches recent market data from Alpaca
    - Generates signals using same logic as backtest
    - Places orders via Alpaca API
    - Records trades in database
    - Respects risk limits (max position size, daily loss)
    - Stop loss and take profit execution
  - Execution API (`/api/execution`):
    - GET /status - Scheduler status (running, active strategies, next run)
    - GET /logs - Execution logs with signals
    - POST /{id}/execute - Manual strategy execution
  - Strategy deploy/pause/stop now integrates with scheduler
  - Frontend updates:
    - Execute button on active strategies
    - Execution result notifications
    - Strategy source type for trades
- [x] **Live Data Streaming** (2026-01-25)
  - WebSocket infrastructure (`app/api/routes/websocket.py`):
    - Connection manager for multi-user support
    - Token-based authentication
    - Symbol subscription system
  - Real-time streaming:
    - Quote updates (polls Alpaca every 5 seconds)
    - Position updates (every 10 seconds)
    - Execution notifications
    - Heartbeat for connection keep-alive
  - Frontend WebSocket hook (`lib/useWebSocket.ts`):
    - Auto-connect with token authentication
    - Reconnect on disconnect
    - Symbol subscription/unsubscription
    - Typed message handling
  - Dashboard integration:
    - Live connection indicator (green/offline)
    - Real-time position updates
    - Auto-refresh without manual intervention
- [x] **Settings & Profile** (2026-01-25)
  - User profile section with Clerk data display
  - Alpaca connection management:
    - Connect with API key + secret
    - Show/hide secret key toggle
    - Disconnect functionality
    - Connection status badge
  - Default risk settings management:
    - Max position size (% of portfolio)
    - Max daily loss (% of portfolio)
    - Default stop loss (%)
    - Default take profit (%)
    - Settings saved to backend via API
  - Database migration for user settings columns
  - Notifications section (placeholder for future)
- [x] **Performance Analytics** (2026-01-25)
  - Historical performance charts
  - Strategy comparison page (`/dashboard/compare`)
  - Trading journal with notes (`/dashboard/journal`)
  - Analytics dashboard (`/dashboard/analytics`)
- [x] **Error Visibility** (2026-01-25)
  - Trading account connection failure error display
  - Duplicate chart rendering fix on backtest detail page
- [x] **Auto-Execute & Strategy Management** (2026-03-06)
  - `auto_execute` field on Strategy model
  - Toggle auto-execute API endpoint (`POST /{id}/toggle-auto-execute`)
  - Auto-execute toggle switch in strategy list UI
  - Delete confirmation dialogs for strategies
  - Cascade delete for strategy backtests
- [x] **Notifications & Toast System** (2026-03-06)
  - Real-time notification bell component with live alerts
  - Toast notification system with ToastProvider
  - Sticky navbar with responsive mobile menu
- [x] **Onboarding & UI Components** (2026-03-06)
  - First-time user onboarding modal
  - AlertDialog and ConfirmDialog UI primitives
  - Switch toggle component
  - New dependencies: `@radix-ui/react-alert-dialog`, `@radix-ui/react-switch`

### Project Structure
```
get-rich-v2/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/           # auth, strategies, backtests, orders, trading, execution
│   │   │   └── deps.py           # Auth dependencies (Clerk JWT)
│   │   ├── core/                 # config, risk_manager, database
│   │   ├── models/               # User, Strategy, Backtest, Trade
│   │   ├── services/             # alpaca, user, strategy, backtest, scheduler, executor
│   │   ├── strategies/           # base strategy class
│   │   └── main.py
│   ├── alembic/                  # Database migrations
│   │   └── versions/             # Migration scripts
│   ├── .env                      # DB, Redis, Clerk, Alpaca keys
│   └── pyproject.toml
├── frontend/
│   ├── app/
│   │   ├── (auth)/               # sign-in, sign-up pages
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx      # Main dashboard
│   │   │   │   ├── strategies/   # Strategy list & builder
│   │   │   │   ├── backtests/    # Backtest list & detail
│   │   │   │   ├── trades/       # Trade history
│   │   │   │   ├── analytics/   # Performance analytics
│   │   │   │   ├── compare/     # Strategy comparison
│   │   │   │   ├── journal/     # Trading journal
│   │   │   │   └── settings/     # User settings & profile
│   │   │   └── layout.tsx        # Dashboard nav
│   │   ├── layout.tsx            # ClerkProvider wrapper
│   │   └── page.tsx              # Landing page
│   ├── components/ui/            # shadcn components + custom
│   ├── lib/
│   │   ├── api.ts                # API client
│   │   └── utils.ts              # Utilities
│   ├── middleware.ts             # Route protection
│   └── .env.local                # Clerk keys
└── docker-compose.yml            # Postgres + Redis
```

### API Endpoints

**Auth (`/api/auth`)**
- `GET /me` - Get current user profile
- `PUT /settings` - Update user default risk settings
- `POST /connect-alpaca` - Connect Alpaca credentials
- `POST /disconnect-alpaca` - Disconnect Alpaca

**Strategies (`/api/strategies`)**
- `GET /types` - List available strategy types with parameters
- `GET /` - List user's strategies
- `GET /{id}` - Get strategy details
- `POST /` - Create new strategy
- `PUT /{id}` - Update strategy
- `DELETE /{id}` - Delete strategy
- `POST /{id}/deploy` - Deploy strategy to paper trading
- `POST /{id}/pause` - Pause active strategy
- `POST /{id}/stop` - Stop strategy
- `POST /{id}/toggle-auto-execute` - Toggle auto-execution for active strategy

**Backtests (`/api/backtests`)**
- `GET /` - List user's backtests (optional: filter by strategy_id)
- `GET /{id}` - Get backtest details with equity curve and trade log
- `POST /` - Run a new backtest
- `DELETE /{id}` - Delete a backtest

**Trading (`/api/trading`)**
- `GET /account` - Get account info (buying power, equity)
- `GET /positions` - List all positions
- `GET /positions/{symbol}` - Get position for symbol
- `GET /quote/{symbol}` - Get latest quote
- `GET /bars/{symbol}` - Get historical OHLCV bars
- `POST /orders` - Place market/limit order
- `GET /orders/{order_id}` - Get order details
- `DELETE /orders/{order_id}` - Cancel order

**Orders/Trades (`/api/orders`)**
- `GET /` - List user's trade history (with optional source filter)
- `GET /{trade_id}` - Get trade details
- `DELETE /{trade_id}` - Cancel pending trade

**Execution (`/api/execution`)**
- `GET /status` - Get scheduler status (running, active strategies, next run)
- `GET /logs` - Get execution logs (optional: filter by strategy_id)
- `POST /{strategy_id}/execute` - Manually trigger strategy execution

**WebSocket (`/api/ws`)**
- `WS /ws?token=<auth_token>` - Real-time data streaming
  - Inbound: `{"action": "subscribe", "symbols": ["AAPL"]}`
  - Outbound: `{"type": "quote|positions|execution|heartbeat", ...}`

### Backtest Metrics Calculated

| Metric | Description |
|--------|-------------|
| Total Return | Overall portfolio return (%) |
| Sharpe Ratio | Risk-adjusted return (annualized) |
| Sortino Ratio | Downside risk-adjusted return |
| Max Drawdown | Largest peak-to-trough decline (%) |
| Win Rate | Percentage of profitable trades |
| Profit Factor | Gross profit / gross loss |
| Final Value | Ending portfolio value |

### Tech Stack
- **Frontend:** Next.js 14, TypeScript, Tailwind, shadcn/ui, Clerk, lightweight-charts
- **Backend:** FastAPI, SQLAlchemy (async), Pydantic, pandas, numpy, APScheduler
- **Database:** TimescaleDB (Postgres), Redis
- **Broker:** Alpaca (paper trading)
- **Auth:** Clerk

### Environment Variables Configured
- `frontend/.env.local` - Clerk publishable + secret keys, NEXT_PUBLIC_API_URL
- `backend/.env` - Database, Redis, Clerk, Alpaca keys

## Next Steps (Priority Order)

1. **Advanced Features**:
   - Multiple broker support
   - Custom strategy code editor
   - Portfolio optimization

2. **Production Readiness**:
   - Error monitoring and logging
   - Rate limiting
   - Database backups

## Commands

```bash
# Start Docker services
cd ~/repos/get-rich-v2
docker compose up -d

# Run database migrations
cd backend
alembic upgrade head

# Start frontend
cd frontend
npm run dev

# Start backend
cd backend
uvicorn app.main:app --reload
```

## API Testing

```bash
# Health check
curl http://localhost:8000/health

# Get strategy types (no auth required)
curl http://localhost:8000/api/strategies/types

# Create a strategy (with auth)
curl -X POST http://localhost:8000/api/strategies/ \
  -H "Authorization: Bearer dev:user123:test@example.com:Test User" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Momentum Strategy",
    "strategy_type": "momentum",
    "symbols": ["AAPL", "GOOGL"],
    "parameters": {"lookback_period": 20, "momentum_threshold": 5},
    "max_position_size": 0.1,
    "max_daily_loss": 0.05
  }'

# Run a backtest
curl -X POST http://localhost:8000/api/backtests/ \
  -H "Authorization: Bearer dev:user123:test@example.com:Test User" \
  -H "Content-Type: application/json" \
  -d '{
    "strategy_id": 1,
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "initial_capital": 100000
  }'

# Get scheduler status
curl http://localhost:8000/api/execution/status \
  -H "Authorization: Bearer dev:user123:test@example.com:Test User"

# Manually execute a strategy
curl -X POST http://localhost:8000/api/execution/1/execute \
  -H "Authorization: Bearer dev:user123:test@example.com:Test User"
```

## Notes
- Using Alpaca paper trading (https://paper-api.alpaca.markets)
- Clerk configured with Email + Google sign-in
- All protected routes require authentication
- Run `alembic upgrade head` after starting Docker to create tables
- Dev tokens supported: `dev:<clerk_id>:<email>:<name>` for testing without Clerk
- Strategy Builder: `/dashboard/strategies/new`
- Backtests: `/dashboard/backtests`
- Trade History: `/dashboard/trades`
