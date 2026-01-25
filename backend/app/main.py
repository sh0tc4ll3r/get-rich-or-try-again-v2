import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, backtests, execution, orders, strategies, trading, websocket
from app.core.config import settings
from app.core.database import engine
from app.services.scheduler import get_scheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup: start the strategy scheduler
    scheduler = get_scheduler()
    await scheduler.start()
    logger.info("Strategy scheduler initialized")

    yield

    # Shutdown: stop scheduler and dispose database engine
    await scheduler.stop()
    await engine.dispose()
    logger.info("Application shutdown complete")


app = FastAPI(
    title="Get Rich v2 API",
    description="Algorithmic Trading Platform for Technically Curious Traders",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(strategies.router, prefix="/api/strategies", tags=["strategies"])
app.include_router(backtests.router, prefix="/api/backtests", tags=["backtests"])
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(trading.router, prefix="/api/trading", tags=["trading"])
app.include_router(execution.router, prefix="/api/execution", tags=["execution"])
app.include_router(websocket.router, prefix="/api", tags=["websocket"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "0.1.0"}
