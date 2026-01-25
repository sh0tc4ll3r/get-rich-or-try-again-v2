/**
 * API client for communicating with the backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Types
export interface StrategyParameter {
  name: string;
  label: string;
  type: "int" | "float";
  default: number;
  min?: number;
  max?: number;
}

export interface StrategyType {
  id: string;
  name: string;
  description: string;
  parameters: StrategyParameter[];
}

export interface Strategy {
  id: number;
  name: string;
  strategy_type: string;
  symbols: string[];
  parameters: Record<string, number>;
  max_position_size: number;
  max_daily_loss: number;
  stop_loss_pct: number | null;
  take_profit_pct: number | null;
  status: "draft" | "active" | "paused" | "stopped";
  created_at: string;
  deployed_at: string | null;
}

export interface CreateStrategyRequest {
  name: string;
  strategy_type: string;
  symbols: string[];
  parameters?: Record<string, number>;
  max_position_size?: number;
  max_daily_loss?: number;
  stop_loss_pct?: number | null;
  take_profit_pct?: number | null;
}

export interface UpdateStrategyRequest {
  name?: string;
  symbols?: string[];
  parameters?: Record<string, number>;
  max_position_size?: number;
  max_daily_loss?: number;
  stop_loss_pct?: number | null;
  take_profit_pct?: number | null;
}

export interface UserProfile {
  id: number;
  clerk_id: string;
  email: string;
  name: string | null;
  alpaca_connected: boolean;
  default_max_position_size: number;
  default_max_daily_loss: number;
  default_stop_loss_pct: number | null;
  default_take_profit_pct: number | null;
}

export interface UpdateSettingsRequest {
  default_max_position_size?: number;
  default_max_daily_loss?: number;
  default_stop_loss_pct?: number | null;
  default_take_profit_pct?: number | null;
}

export interface AccountInfo {
  account_id: string;
  buying_power: string;
  cash: string;
  portfolio_value: string;
  equity: string;
  last_equity: string;
  currency: string;
  status: string;
  trading_blocked: boolean;
  pattern_day_trader: boolean;
}

export interface Position {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
  side: string;
}

export interface Backtest {
  id: number;
  strategy_id: number;
  strategy_name: string | null;
  start_date: string;
  end_date: string;
  initial_capital: number;
  status: "pending" | "running" | "completed" | "failed";
  error_message: string | null;
  total_return: number | null;
  sharpe_ratio: number | null;
  sortino_ratio: number | null;
  max_drawdown: number | null;
  win_rate: number | null;
  profit_factor: number | null;
  total_trades: number | null;
  final_value: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface BacktestDetail extends Backtest {
  equity_curve: Array<{ date: string; equity: number; cash: number }> | null;
  trade_log: Array<{
    date: string;
    symbol: string;
    side: string;
    qty: number;
    price: number;
    value: number;
    pnl?: number;
    pnl_pct?: number;
    reason: string;
  }> | null;
  parameters_snapshot: Record<string, number> | null;
}

export interface RunBacktestRequest {
  strategy_id: number;
  start_date: string;
  end_date: string;
  initial_capital?: number;
}

export interface Trade {
  id: number;
  strategy_id: number | null;
  broker_order_id: string | null;
  symbol: string;
  side: string;
  order_type: string;
  quantity: string;
  limit_price: string | null;
  stop_price: string | null;
  filled_quantity: string;
  filled_avg_price: string | null;
  commission: string;
  status: string;
  source: string;
  signal_reason: string | null;
  created_at: string;
  submitted_at: string | null;
  filled_at: string | null;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new ApiError(response.status, error.detail || "Request failed");
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Auth API
export const authApi = {
  getProfile: (token: string) =>
    request<UserProfile>("/api/auth/me", {}, token),

  connectAlpaca: (token: string, apiKey: string, secretKey: string) =>
    request<{ connected: boolean; account_id: string; buying_power: string }>(
      "/api/auth/connect-alpaca",
      {
        method: "POST",
        body: JSON.stringify({ api_key: apiKey, secret_key: secretKey }),
      },
      token
    ),

  disconnectAlpaca: (token: string) =>
    request<{ disconnected: boolean }>(
      "/api/auth/disconnect-alpaca",
      { method: "POST" },
      token
    ),

  updateSettings: (token: string, settings: UpdateSettingsRequest) =>
    request<UserProfile>(
      "/api/auth/settings",
      {
        method: "PUT",
        body: JSON.stringify(settings),
      },
      token
    ),
};

// Strategies API
export const strategiesApi = {
  getTypes: () => request<StrategyType[]>("/api/strategies/types"),

  list: (token: string) => request<Strategy[]>("/api/strategies/", {}, token),

  get: (token: string, id: number) =>
    request<Strategy>(`/api/strategies/${id}`, {}, token),

  create: (token: string, data: CreateStrategyRequest) =>
    request<Strategy>(
      "/api/strategies/",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      token
    ),

  update: (token: string, id: number, data: UpdateStrategyRequest) =>
    request<Strategy>(
      `/api/strategies/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
      token
    ),

  delete: (token: string, id: number) =>
    request<void>(`/api/strategies/${id}`, { method: "DELETE" }, token),

  deploy: (token: string, id: number) =>
    request<Strategy>(`/api/strategies/${id}/deploy`, { method: "POST" }, token),

  pause: (token: string, id: number) =>
    request<Strategy>(`/api/strategies/${id}/pause`, { method: "POST" }, token),

  stop: (token: string, id: number) =>
    request<Strategy>(`/api/strategies/${id}/stop`, { method: "POST" }, token),
};

// Trading API
export const tradingApi = {
  getAccount: () => request<AccountInfo>("/api/trading/account"),

  getPositions: () => request<Position[]>("/api/trading/positions"),

  getQuote: (symbol: string) =>
    request<{
      symbol: string;
      bid_price: string;
      ask_price: string;
      bid_size: number;
      ask_size: number;
      timestamp: string;
    }>(`/api/trading/quote/${symbol}`),

  getBars: (
    symbol: string,
    timeframe = "1Day",
    limit = 100
  ) =>
    request<
      Array<{
        timestamp: string;
        open: string;
        high: string;
        low: string;
        close: string;
        volume: number;
        vwap: string | null;
      }>
    >(`/api/trading/bars/${symbol}?timeframe=${timeframe}&limit=${limit}`),
};

// Backtests API
export const backtestsApi = {
  list: (token: string, strategyId?: number) => {
    const params = strategyId ? `?strategy_id=${strategyId}` : "";
    return request<Backtest[]>(`/api/backtests/${params}`, {}, token);
  },

  get: (token: string, id: number) =>
    request<BacktestDetail>(`/api/backtests/${id}`, {}, token),

  run: (token: string, data: RunBacktestRequest) =>
    request<Backtest>(
      "/api/backtests/",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      token
    ),

  delete: (token: string, id: number) =>
    request<void>(`/api/backtests/${id}`, { method: "DELETE" }, token),
};

// Trades API
export const tradesApi = {
  list: (token: string, source?: string, limit = 50) => {
    const params = new URLSearchParams();
    if (source) params.set("source", source);
    params.set("limit", limit.toString());
    return request<Trade[]>(`/api/orders/?${params.toString()}`, {}, token);
  },

  get: (token: string, id: number) =>
    request<Trade>(`/api/orders/${id}`, {}, token),

  cancel: (token: string, id: number) =>
    request<{ status: string; trade_id: number }>(
      `/api/orders/${id}`,
      { method: "DELETE" },
      token
    ),
};

// Execution API
export interface SchedulerStatus {
  running: boolean;
  active_strategies: number;
  strategy_ids: number[];
  next_run: string | null;
}

export interface ExecutionLog {
  strategy_id: number;
  status: string;
  message: string;
  signals: Array<{
    symbol: string;
    action: string;
    qty?: number;
    price?: number;
    order_id?: string;
    status?: string;
    reason?: string;
    error?: string;
  }>;
  timestamp: string;
}

export interface ExecuteResult {
  strategy_id: number;
  strategy_name: string;
  signals: Array<{
    symbol: string;
    action: string;
    qty?: number;
    price?: number;
    order_id?: string;
    status?: string;
    reason?: string;
    error?: string;
  }>;
  message: string;
}

export const executionApi = {
  getStatus: (token: string) =>
    request<SchedulerStatus>("/api/execution/status", {}, token),

  getLogs: (token: string, strategyId?: number, limit = 50) => {
    const params = new URLSearchParams();
    if (strategyId) params.set("strategy_id", strategyId.toString());
    params.set("limit", limit.toString());
    return request<ExecutionLog[]>(
      `/api/execution/logs?${params.toString()}`,
      {},
      token
    );
  },

  execute: (token: string, strategyId: number) =>
    request<ExecuteResult>(
      `/api/execution/${strategyId}/execute`,
      { method: "POST" },
      token
    ),
};
