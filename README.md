# Get Rich v2

**Understand and deploy systematic trading strategies.**

A web platform for technically curious traders who want to go beyond "buy and hold" without building their own infrastructure.

## What This Is

An algorithmic trading platform that prioritizes **education and transparency**:
- Every strategy comes with an explanation of *why* it works
- Every backtest shows not just returns, but *why* trades won or lost
- Progressive disclosure: start simple, unlock complexity as you learn

## Target User

The **technically curious trader**:
- Knows what RSI is, understands basic charts
- Wants systematic trading without writing code
- Values understanding over blind automation
- Reads r/algotrading but hasn't built their own system

## Tech Stack

- **Backend:** Python 3.11+ / FastAPI / SQLAlchemy / APScheduler
- **Database:** PostgreSQL / Redis
- **Frontend:** Next.js 14 / TypeScript / shadcn/ui / Lightweight Charts
- **Auth:** Clerk
- **Broker:** Alpaca (paper trading)

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL & Redis (via Docker or Homebrew)

### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL and Redis
docker compose up -d

# Backend setup
cd backend
cp .env.example .env
# Edit .env with your Clerk and Alpaca keys
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Option B: Using Homebrew (macOS)

```bash
# Install and start PostgreSQL + Redis
brew install postgresql@15 redis
brew services start postgresql@15
brew services start redis

# Create database
/opt/homebrew/opt/postgresql@15/bin/createdb getrich

# Backend setup
cd backend
cp .env.example .env
# Edit .env - update DATABASE_URL to use your macOS username:
# DATABASE_URL=postgresql+asyncpg://YOUR_USERNAME@localhost:5432/getrich

python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Access the App

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

### Environment Variables

**Backend (`backend/.env`):**
```bash
DATABASE_URL=postgresql+asyncpg://localhost:5432/getrich
REDIS_URL=redis://localhost:6379/0
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
ALPACA_API_KEY=PK...
ALPACA_SECRET_KEY=...
ALPACA_BASE_URL=https://paper-api.alpaca.markets
```

**Frontend (`frontend/.env.local`):**
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Features

### Completed
- [x] **Authentication** - Clerk integration with Google sign-in
- [x] **Strategy Builder** - Create strategies with 4 types (Momentum, Mean Reversion, RSI, Breakout)
- [x] **Backtesting Engine** - Historical simulation with equity curves and trade logs
- [x] **Performance Metrics** - Sharpe ratio, Sortino ratio, max drawdown, win rate, profit factor
- [x] **Live Execution** - Automated strategy execution during market hours (APScheduler)
- [x] **Real-time Streaming** - WebSocket for live quotes and position updates
- [x] **Dashboard** - Portfolio overview, positions, recent trades
- [x] **Settings** - Alpaca connection, risk settings management

### Planned
- [ ] Performance Analytics - Historical performance charts, trade journal
- [ ] Multiple broker support
- [ ] Custom strategy code editor

## Project Structure

```
get-rich-v2/
├── backend/
│   ├── app/
│   │   ├── api/routes/     # API endpoints (auth, strategies, backtests, etc.)
│   │   ├── core/           # Config, database, risk management
│   │   ├── models/         # SQLAlchemy models (User, Strategy, Backtest, Trade)
│   │   ├── services/       # Business logic (Alpaca, backtest engine, scheduler)
│   │   └── strategies/     # Trading strategy implementations
│   └── alembic/            # Database migrations
├── frontend/
│   ├── app/                # Next.js App Router pages
│   │   └── (dashboard)/    # Protected dashboard routes
│   ├── components/         # React components (shadcn/ui)
│   └── lib/                # API client, WebSocket hook, utilities
└── docker-compose.yml
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/auth/me` | Get current user profile |
| `PUT /api/auth/settings` | Update user settings |
| `POST /api/auth/connect-alpaca` | Connect Alpaca account |
| `GET /api/strategies/` | List strategies |
| `POST /api/strategies/` | Create strategy |
| `POST /api/strategies/{id}/deploy` | Deploy strategy for live trading |
| `GET /api/backtests/` | List backtests |
| `POST /api/backtests/` | Run a backtest |
| `GET /api/backtests/{id}` | Get backtest results with equity curve |
| `GET /api/execution/status` | Get scheduler status |
| `POST /api/execution/{id}/execute` | Manually trigger strategy |
| `WS /api/ws?token=...` | Real-time data streaming |

## License

Proprietary - All rights reserved.
