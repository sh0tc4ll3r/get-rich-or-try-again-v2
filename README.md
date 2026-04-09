# Get Rich or Try Again

**Paper trading. Real strategies. No risk — just try again.**

An algorithmic trading platform that lets retail traders build, backtest, and deploy strategies to paper trading — all in one place.

## Origin Story

This started as an engineering degree final project ~4 years ago. I rebuilt it from scratch as a full-stack product with Next.js, FastAPI, and Alpaca — this time thinking as a PM, not just an engineer. The result is a platform that makes quant trading accessible without dumbing it down.

## The Problem

Retail traders have strategy ideas but no safe way to validate them before risking real money. Existing tools are either too complex (QuantConnect, Zipline) or too simplistic (most trading apps). There's a gap for technically curious traders who want systematic trading without building their own infrastructure.

## The Solution

A complete workflow from idea to live paper trading:

1. **Build Strategy** — Choose from RSI, Momentum, Mean Reversion, or Breakout. Configure risk limits and target symbols.
2. **Backtest** — Run against historical data. See Sharpe ratio, max drawdown, win rate, and full trade logs.
3. **Deploy** — Push to Alpaca paper trading with built-in guardrails (stop-loss, position sizing, daily loss limits).
4. **Monitor** — Real-time dashboard with WebSocket streaming for live positions, P&L, and execution logs.

## Product Decisions

**Why these 4 strategy types?**
RSI and Momentum are the most recognized by retail traders — they lower the learning curve. Mean Reversion and Breakout cover different market regimes (range-bound vs. trending), giving users enough variety without overwhelming them.

**Why backtesting-first?**
The backtest → deploy flow forces validation before capital allocation. This mirrors how professional quant shops work and protects users from deploying untested ideas.

**Why Alpaca?**
Free paper trading API, well-documented, no minimum balance. It removes the biggest barrier to entry for a side-project trading platform.

**What I'd build next (and why):**
1. **Custom strategy code editor** — power users want flexibility beyond presets
2. **Strategy marketplace** — let users share and fork strategies (network effects)
3. **Multi-broker support** — reduce vendor lock-in, expand addressable market

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Lightweight Charts |
| Backend | Python 3.11, FastAPI, SQLAlchemy, APScheduler |
| Database | PostgreSQL, Redis |
| Auth | Clerk |
| Broker | Alpaca (paper trading) |
| Real-time | WebSocket |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL & Redis (via Docker or Homebrew)

### Setup

```bash
# Start PostgreSQL and Redis
docker compose up -d

# Backend
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

### Demo Mode

To see the app with populated data (no backend required):

```bash
# Add to frontend/.env.local
NEXT_PUBLIC_DEMO_MODE=true
```

Then run `npm run dev` and navigate to `http://localhost:3000`.

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
NEXT_PUBLIC_DEMO_MODE=false
```

## Project Structure

```
get-rich-or-try-again/
  backend/
    app/
      api/routes/     # API endpoints (auth, strategies, backtests, etc.)
      core/           # Config, database, risk management
      models/         # SQLAlchemy models (User, Strategy, Backtest, Trade)
      services/       # Business logic (Alpaca, backtest engine, scheduler)
      strategies/     # Trading strategy implementations
    alembic/          # Database migrations
  frontend/
    app/              # Next.js App Router pages
      (dashboard)/    # Protected dashboard routes
    components/       # React components (shadcn/ui)
    lib/              # API client, WebSocket hook, demo data
```

## License

Proprietary - All rights reserved.
