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

**Backend:** Python 3.11+ / FastAPI / SQLAlchemy / Celery
**Database:** PostgreSQL + TimescaleDB / Redis
**Frontend:** Next.js 14 / TypeScript / shadcn/ui / Lightweight Charts
**Auth:** Clerk
**Broker:** Alpaca

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 20+
- pnpm

### Setup

1. Start the database and cache:
```bash
docker compose up -d
```

2. Set up the backend:
```bash
cd backend
cp .env.example .env
# Edit .env with your Clerk and Alpaca keys
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

3. Run database migrations:
```bash
alembic upgrade head
```

4. Start the backend:
```bash
uvicorn app.main:app --reload
```

5. Set up the frontend (in a new terminal):
```bash
cd frontend
pnpm install
pnpm dev
```

## Project Structure

```
get-rich-v2/
├── backend/
│   ├── app/
│   │   ├── api/routes/     # API endpoints
│   │   ├── core/           # Config, security, risk management
│   │   ├── models/         # SQLAlchemy models
│   │   ├── services/       # Business logic (Alpaca, backtesting)
│   │   └── strategies/     # Trading strategy implementations
│   ├── tests/
│   └── alembic/            # Database migrations
├── frontend/
│   ├── app/                # Next.js App Router pages
│   ├── components/         # React components
│   └── lib/                # Utilities and API client
└── docker-compose.yml
```

## Development Phases

- [x] Phase 1: Foundation + Risk Guardrails
- [ ] Phase 2: Backtesting Engine
- [ ] Phase 3: Strategies (with Backtests)
- [ ] Phase 4: Advanced Risk Management
- [ ] Phase 5: SaaS Infrastructure
- [ ] Phase 6: Institutional Patterns

## License

Proprietary - All rights reserved.
