"""Background scheduler for strategy execution."""

import logging
from datetime import datetime, timezone
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.models import Strategy, StrategyStatus, User
from app.services.executor import StrategyRunner

logger = logging.getLogger(__name__)


class SchedulerService:
    """Service for managing scheduled strategy execution."""

    _instance: "SchedulerService | None" = None

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._running_strategies: dict[int, str] = {}  # strategy_id -> job_id
        self._execution_logs: list[dict[str, Any]] = []

    @classmethod
    def get_instance(cls) -> "SchedulerService":
        """Get singleton instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def start(self):
        """Start the scheduler and load active strategies."""
        if self.scheduler.running:
            return

        # Add market hours check job (runs every minute during market hours)
        self.scheduler.add_job(
            self._check_and_execute_strategies,
            CronTrigger(
                day_of_week="mon-fri",
                hour="9-15",
                minute="*/5",  # Every 5 minutes during market hours
                timezone="America/New_York",
            ),
            id="strategy_executor",
            replace_existing=True,
        )

        # Add end-of-day job for any cleanup
        self.scheduler.add_job(
            self._end_of_day_cleanup,
            CronTrigger(
                day_of_week="mon-fri",
                hour=16,
                minute=5,
                timezone="America/New_York",
            ),
            id="eod_cleanup",
            replace_existing=True,
        )

        self.scheduler.start()
        logger.info("Strategy scheduler started")

        # Load and schedule active strategies
        await self._load_active_strategies()

    async def stop(self):
        """Stop the scheduler."""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Strategy scheduler stopped")

    async def _load_active_strategies(self):
        """Load all active strategies on startup."""
        async with async_session_factory() as db:
            result = await db.execute(
                select(Strategy).where(Strategy.status == StrategyStatus.ACTIVE.value)
            )
            strategies = result.scalars().all()
            logger.info(f"Found {len(strategies)} active strategies to schedule")
            for strategy in strategies:
                self._running_strategies[strategy.id] = f"strategy_{strategy.id}"

    async def schedule_strategy(self, strategy_id: int):
        """Mark a strategy as scheduled for execution."""
        self._running_strategies[strategy_id] = f"strategy_{strategy_id}"
        logger.info(f"Strategy {strategy_id} scheduled for execution")

    async def unschedule_strategy(self, strategy_id: int):
        """Remove a strategy from scheduled execution."""
        if strategy_id in self._running_strategies:
            del self._running_strategies[strategy_id]
            logger.info(f"Strategy {strategy_id} unscheduled")

    async def _check_and_execute_strategies(self):
        """Execute all active strategies."""
        if not self._running_strategies:
            return

        logger.info(f"Executing {len(self._running_strategies)} strategies")

        async with async_session_factory() as db:
            for strategy_id in list(self._running_strategies.keys()):
                try:
                    await self._execute_strategy(db, strategy_id)
                except Exception as e:
                    logger.error(f"Error executing strategy {strategy_id}: {e}")
                    self._log_execution(strategy_id, "error", str(e))

    async def _execute_strategy(self, db: AsyncSession, strategy_id: int):
        """Execute a single strategy."""
        # Fetch strategy with user
        result = await db.execute(
            select(Strategy).where(Strategy.id == strategy_id)
        )
        strategy = result.scalar_one_or_none()

        if not strategy or strategy.status != StrategyStatus.ACTIVE.value:
            # Strategy was stopped or deleted
            await self.unschedule_strategy(strategy_id)
            return

        # Fetch user for Alpaca credentials
        result = await db.execute(
            select(User).where(User.id == strategy.user_id)
        )
        user = result.scalar_one_or_none()

        if not user or not user.alpaca_api_key:
            logger.warning(f"Strategy {strategy_id}: User has no Alpaca credentials")
            self._log_execution(strategy_id, "skipped", "No Alpaca credentials")
            return

        # Execute strategy
        runner = StrategyRunner(
            db=db,
            user=user,
            strategy=strategy,
        )

        signals = await runner.execute()
        await db.commit()

        self._log_execution(
            strategy_id,
            "success",
            f"Generated {len(signals)} signals",
            signals=signals,
        )

    async def _end_of_day_cleanup(self):
        """End of day cleanup tasks."""
        logger.info("Running end-of-day cleanup")
        # Could add: close all positions, update daily stats, etc.

    def _log_execution(
        self,
        strategy_id: int,
        status: str,
        message: str,
        signals: list | None = None,
    ):
        """Log an execution event."""
        log_entry = {
            "strategy_id": strategy_id,
            "status": status,
            "message": message,
            "signals": signals or [],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._execution_logs.append(log_entry)
        # Keep only last 1000 entries
        if len(self._execution_logs) > 1000:
            self._execution_logs = self._execution_logs[-1000:]

    def get_execution_logs(
        self,
        strategy_id: int | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Get recent execution logs."""
        logs = self._execution_logs
        if strategy_id:
            logs = [l for l in logs if l["strategy_id"] == strategy_id]
        return list(reversed(logs[-limit:]))

    def get_status(self) -> dict[str, Any]:
        """Get scheduler status."""
        return {
            "running": self.scheduler.running,
            "active_strategies": len(self._running_strategies),
            "strategy_ids": list(self._running_strategies.keys()),
            "next_run": self._get_next_run_time(),
        }

    def _get_next_run_time(self) -> str | None:
        """Get next scheduled run time."""
        job = self.scheduler.get_job("strategy_executor")
        if job and job.next_run_time:
            return job.next_run_time.isoformat()
        return None


# Convenience function for accessing the scheduler
def get_scheduler() -> SchedulerService:
    """Get the scheduler service instance."""
    return SchedulerService.get_instance()
