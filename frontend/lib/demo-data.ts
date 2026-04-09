/**
 * Demo/seed data for portfolio showcase mode.
 * Activated by setting NEXT_PUBLIC_DEMO_MODE=true in .env.local
 */

import type {
  AccountInfo,
  Position,
  Strategy,
  Trade,
  Backtest,
  PerformanceData,
  UserProfile,
} from "./api";

export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// --- Account ---

export const demoAccount: AccountInfo = {
  account_id: "demo-account-001",
  buying_power: "57855.62",
  cash: "57855.62",
  portfolio_value: "103847.62",
  equity: "103847.62",
  last_equity: "102391.18",
  currency: "USD",
  status: "ACTIVE",
  trading_blocked: false,
  pattern_day_trader: false,
};

// --- Positions ---

export const demoPositions: Position[] = [
  {
    symbol: "AAPL",
    qty: "45",
    avg_entry_price: "189.32",
    market_value: "8892.00",
    unrealized_pl: "372.60",
    unrealized_plpc: "0.0437",
    current_price: "197.60",
    side: "long",
  },
  {
    symbol: "NVDA",
    qty: "25",
    avg_entry_price: "875.40",
    market_value: "23175.00",
    unrealized_pl: "1290.00",
    unrealized_plpc: "0.0589",
    current_price: "927.00",
    side: "long",
  },
  {
    symbol: "MSFT",
    qty: "25",
    avg_entry_price: "412.85",
    market_value: "10475.00",
    unrealized_pl: "153.75",
    unrealized_plpc: "0.0149",
    current_price: "419.00",
    side: "long",
  },
  {
    symbol: "TSLA",
    qty: "20",
    avg_entry_price: "178.50",
    market_value: "3450.00",
    unrealized_pl: "-120.00",
    unrealized_plpc: "-0.0336",
    current_price: "172.50",
    side: "long",
  },
];

// --- Strategies ---

export const demoStrategies: Strategy[] = [
  {
    id: 1,
    name: "RSI Oversold Bounce",
    strategy_type: "rsi",
    symbols: ["AAPL", "NVDA"],
    parameters: { rsi_period: 14, oversold_level: 30, overbought_level: 70 },
    max_position_size: 0.08,
    max_daily_loss: 0.03,
    stop_loss_pct: 3,
    take_profit_pct: 6,
    status: "active",
    auto_execute: true,
    created_at: daysAgo(45),
    deployed_at: daysAgo(42),
  },
  {
    id: 2,
    name: "TSLA Momentum",
    strategy_type: "momentum",
    symbols: ["TSLA"],
    parameters: { lookback_period: 20, momentum_threshold: 5 },
    max_position_size: 0.1,
    max_daily_loss: 0.05,
    stop_loss_pct: 5,
    take_profit_pct: 10,
    status: "paused",
    auto_execute: false,
    created_at: daysAgo(30),
    deployed_at: daysAgo(25),
  },
  {
    id: 3,
    name: "MSFT Mean Reversion",
    strategy_type: "mean_reversion",
    symbols: ["MSFT"],
    parameters: { sma_period: 20, deviation_threshold: 2 },
    max_position_size: 0.06,
    max_daily_loss: 0.03,
    stop_loss_pct: 4,
    take_profit_pct: 5,
    status: "draft",
    auto_execute: false,
    created_at: daysAgo(5),
    deployed_at: null,
  },
];

// --- Backtests ---

export const demoBacktests: Backtest[] = [
  {
    id: 1,
    strategy_id: 1,
    strategy_name: "RSI Oversold Bounce",
    start_date: "2025-01-01",
    end_date: "2025-12-31",
    initial_capital: 100000,
    status: "completed",
    error_message: null,
    total_return: 18.42,
    sharpe_ratio: 1.83,
    sortino_ratio: 2.41,
    max_drawdown: 7.2,
    win_rate: 62.5,
    profit_factor: 1.94,
    total_trades: 48,
    final_value: 118420,
    created_at: daysAgo(40),
    started_at: daysAgo(40),
    completed_at: daysAgo(40),
  },
  {
    id: 2,
    strategy_id: 2,
    strategy_name: "TSLA Momentum",
    start_date: "2025-06-01",
    end_date: "2025-12-31",
    initial_capital: 100000,
    status: "completed",
    error_message: null,
    total_return: 4.18,
    sharpe_ratio: 0.42,
    sortino_ratio: 0.61,
    max_drawdown: 14.8,
    win_rate: 45.2,
    profit_factor: 1.12,
    total_trades: 31,
    final_value: 104180,
    created_at: daysAgo(28),
    started_at: daysAgo(28),
    completed_at: daysAgo(28),
  },
  {
    id: 3,
    strategy_id: 3,
    strategy_name: "MSFT Mean Reversion",
    start_date: "2025-01-01",
    end_date: "2025-12-31",
    initial_capital: 100000,
    status: "completed",
    error_message: null,
    total_return: 11.67,
    sharpe_ratio: 1.24,
    sortino_ratio: 1.78,
    max_drawdown: 9.1,
    win_rate: 58.3,
    profit_factor: 1.65,
    total_trades: 36,
    final_value: 111670,
    created_at: daysAgo(4),
    started_at: daysAgo(4),
    completed_at: daysAgo(4),
  },
];

// --- Trades ---

export const demoTrades: Trade[] = [
  makeTrade(1, "AAPL", "buy", "45", "189.32", "filled", "strategy", "RSI oversold signal (RSI=28.4)", 1),
  makeTrade(2, "NVDA", "buy", "15", "862.10", "filled", "strategy", "RSI oversold signal (RSI=26.1)", 1),
  makeTrade(3, "NVDA", "buy", "15", "888.70", "filled", "strategy", "RSI oversold signal (RSI=29.8)", 1),
  makeTrade(4, "TSLA", "buy", "20", "178.50", "filled", "strategy", "Momentum breakout (20d return +6.2%)", 2),
  makeTrade(5, "MSFT", "buy", "25", "412.85", "filled", "manual", "Manual entry — mean reversion setup", null),
  makeTrade(6, "AAPL", "sell", "10", "195.40", "filled", "strategy", "RSI overbought signal (RSI=72.1)", 1),
  makeTrade(7, "AAPL", "buy", "10", "191.20", "filled", "strategy", "RSI oversold signal (RSI=31.2)", 1),
  makeTrade(8, "NVDA", "sell", "5", "918.50", "filled", "strategy", "Take profit triggered (+6.5%)", 1),
  makeTrade(9, "TSLA", "sell", "10", "168.30", "canceled", "strategy", "Momentum reversal signal", 2),
  makeTrade(10, "MSFT", "buy", "10", "415.60", "pending", "manual", "Adding to position", null),
];

// --- Analytics ---

export function getDemoPerformance(period: string): PerformanceData {
  const days = periodToDays(period);
  const dates: string[] = [];
  const cumulativeReturns: number[] = [];
  const equityValues: number[] = [];

  const startEquity = 100000;
  let equity = startEquity;
  const rand = lcg(period.length * 7 + days); // deterministic seed per period

  // Fixed reference date so dates don't shift on re-render
  const refDate = new Date("2026-03-06");

  for (let i = days; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);

    // Simulate realistic daily returns with slight upward drift
    const dailyReturn = (rand() - 0.47) * 0.015;
    equity *= 1 + dailyReturn;
    equityValues.push(Math.round(equity * 100) / 100);
    cumulativeReturns.push(
      Math.round(((equity - startEquity) / startEquity) * 10000) / 100
    );
  }

  return {
    period,
    dates,
    equity_values: equityValues,
    cumulative_returns: cumulativeReturns,
    metrics: {
      total_return: cumulativeReturns[cumulativeReturns.length - 1],
      sharpe_ratio: 1.47,
      max_drawdown: 8.3,
      win_rate: 58.9,
      total_trades: 115,
    },
    backtest_count: 3,
  };
}

// --- Demo profile ---

export const demoProfile: UserProfile = {
  id: 1,
  clerk_id: "demo_user",
  email: "demo@getrichorryagain.com",
  name: "Demo User",
  alpaca_connected: true,
  default_max_position_size: 0.1,
  default_max_daily_loss: 0.05,
  default_stop_loss_pct: 5,
  default_take_profit_pct: 10,
};

// --- Deterministic pseudo-random number generator (LCG seeded) ---
// Used so charts look identical on every page load / refresh.

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// --- Portfolio chart data (30-day equity curve with realistic volatility) ---

export function getDemoEquityCurve(): Array<{ time: string; value: number }> {
  const data: Array<{ time: string; value: number }> = [];
  const rand = lcg(42);
  const baseValue = 100000;
  let value = baseValue;

  // Use a fixed reference date so dates don't shift on re-render
  const refDate = new Date("2026-03-06");

  for (let i = 30; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i);

    // Slightly positive drift with realistic daily volatility
    const dailyReturn = (rand() - 0.45) * 0.012;
    value *= 1 + dailyReturn;

    data.push({
      time: d.toISOString().split("T")[0],
      value: Math.round(value * 100) / 100,
    });
  }

  // Ensure last value matches portfolio value
  data[data.length - 1].value = parseFloat(demoAccount.portfolio_value);

  return data;
}

// --- Helpers ---

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function makeTrade(
  id: number,
  symbol: string,
  side: string,
  quantity: string,
  price: string,
  status: string,
  source: string,
  reason: string,
  strategyId: number | null
): Trade {
  const daysOffset = 10 - id; // older trades first
  return {
    id,
    strategy_id: strategyId,
    broker_order_id: `demo-order-${id}`,
    symbol,
    side,
    order_type: "market",
    quantity,
    limit_price: null,
    stop_price: null,
    filled_quantity: status === "filled" ? quantity : "0",
    filled_avg_price: status === "filled" ? price : null,
    commission: "0.00",
    status,
    source,
    signal_reason: reason,
    notes: null,
    notes_updated_at: null,
    created_at: daysAgo(Math.max(daysOffset, 0)),
    submitted_at: daysAgo(Math.max(daysOffset, 0)),
    filled_at: status === "filled" ? daysAgo(Math.max(daysOffset, 0)) : null,
  };
}

function periodToDays(period: string): number {
  switch (period) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    case "1y": return 365;
    case "all": return 365;
    default: return 30;
  }
}
