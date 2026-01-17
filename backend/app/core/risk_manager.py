"""
Risk Manager - Core guardrails for trading operations.

This module enforces non-negotiable risk limits to protect users from
catastrophic losses. These checks run BEFORE any trade is executed.
"""

from dataclasses import dataclass
from decimal import Decimal


@dataclass
class RiskSettings:
    """User's risk configuration."""

    max_position_pct: Decimal = Decimal("0.10")  # Max 10% of portfolio per position
    max_daily_loss_pct: Decimal = Decimal("0.05")  # Stop trading after 5% daily loss
    max_single_trade_pct: Decimal = Decimal("0.05")  # No single trade > 5% of portfolio


class RiskCheckResult:
    """Result of a risk check."""

    def __init__(self, allowed: bool, reason: str | None = None):
        self.allowed = allowed
        self.reason = reason


class RiskManager:
    """
    Enforces trading risk limits.

    All trades must pass through these checks before execution.
    This is a non-negotiable safety layer.
    """

    def __init__(self, settings: RiskSettings):
        self.settings = settings

    def check_position_size(
        self,
        portfolio_value: Decimal,
        trade_value: Decimal,
        existing_position_value: Decimal = Decimal("0"),
    ) -> RiskCheckResult:
        """Check if a trade would exceed max position size."""
        new_position_value = existing_position_value + trade_value
        position_pct = new_position_value / portfolio_value

        if position_pct > self.settings.max_position_pct:
            return RiskCheckResult(
                allowed=False,
                reason=f"Position would be {position_pct:.1%} of portfolio, "
                f"max allowed is {self.settings.max_position_pct:.1%}",
            )
        return RiskCheckResult(allowed=True)

    def check_daily_loss_limit(
        self,
        starting_value: Decimal,
        current_value: Decimal,
    ) -> RiskCheckResult:
        """Check if daily loss limit has been reached."""
        if starting_value == 0:
            return RiskCheckResult(allowed=True)

        daily_return = (current_value - starting_value) / starting_value

        if daily_return < -self.settings.max_daily_loss_pct:
            return RiskCheckResult(
                allowed=False,
                reason=f"Daily loss of {-daily_return:.1%} exceeds limit of "
                f"{self.settings.max_daily_loss_pct:.1%}. Trading halted for today.",
            )
        return RiskCheckResult(allowed=True)

    def check_single_trade_size(
        self,
        portfolio_value: Decimal,
        trade_value: Decimal,
    ) -> RiskCheckResult:
        """Check if a single trade is too large."""
        trade_pct = trade_value / portfolio_value

        if trade_pct > self.settings.max_single_trade_pct:
            return RiskCheckResult(
                allowed=False,
                reason=f"Trade is {trade_pct:.1%} of portfolio, "
                f"max single trade is {self.settings.max_single_trade_pct:.1%}",
            )
        return RiskCheckResult(allowed=True)

    def validate_trade(
        self,
        portfolio_value: Decimal,
        trade_value: Decimal,
        existing_position_value: Decimal,
        daily_starting_value: Decimal,
        current_portfolio_value: Decimal,
    ) -> RiskCheckResult:
        """Run all risk checks for a proposed trade."""
        checks = [
            self.check_position_size(portfolio_value, trade_value, existing_position_value),
            self.check_daily_loss_limit(daily_starting_value, current_portfolio_value),
            self.check_single_trade_size(portfolio_value, trade_value),
        ]

        for check in checks:
            if not check.allowed:
                return check

        return RiskCheckResult(allowed=True)
