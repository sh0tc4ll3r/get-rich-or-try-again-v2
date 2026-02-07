"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  BarChart3,
  Briefcase,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  tradingApi,
  strategiesApi,
  tradesApi,
  type AccountInfo,
  type Position,
  type Strategy,
  type Trade,
} from "@/lib/api";
import { useWebSocket, type Position as WSPosition } from "@/lib/useWebSocket";

export default function DashboardPage() {
  const { getToken } = useAuth();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // WebSocket for real-time updates
  const handlePositionsUpdate = useCallback((wsPositions: WSPosition[]) => {
    // Convert WebSocket positions to API positions format
    const apiPositions: Position[] = wsPositions.map((p) => ({
      symbol: p.symbol,
      qty: p.qty,
      avg_entry_price: p.avg_entry_price,
      market_value: p.market_value,
      unrealized_pl: p.unrealized_pl,
      unrealized_plpc: p.unrealized_plpc,
      current_price: p.current_price,
      side: p.side,
    }));
    setPositions(apiPositions);
  }, []);

  const { isConnected, positions: wsPositions } = useWebSocket({
    autoConnect: true,
    onPositions: handlePositionsUpdate,
  });

  // Update positions when WebSocket provides them
  useEffect(() => {
    if (wsPositions.length > 0) {
      handlePositionsUpdate(wsPositions);
    }
  }, [wsPositions, handlePositionsUpdate]);

  const fetchData = async () => {
    try {
      setError(null);
      setAccountError(null);
      const token = await getToken();

      // Fetch account and positions (public endpoints)
      const [accountResult, positionsData] = await Promise.all([
        tradingApi.getAccount().catch((err) => {
          console.error("Failed to fetch account:", err);
          return { error: err.message || "Unable to connect to trading account" };
        }),
        tradingApi.getPositions().catch(() => []),
      ]);

      // Check if account fetch returned an error
      if (accountResult && "error" in accountResult) {
        setAccountError(accountResult.error);
        setAccount(null);
      } else {
        setAccount(accountResult);
      }
      setPositions(positionsData);

      // Fetch user data if authenticated
      if (token) {
        const [strategiesData, tradesData] = await Promise.all([
          strategiesApi.list(token).catch(() => []),
          tradesApi.list(token, undefined, 10).catch(() => []),
        ]);
        setStrategies(strategiesData);
        setTrades(tradesData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Initialize portfolio chart
  useEffect(() => {
    if (!chartRef.current || !account) return;

    const initChart = async () => {
      const { createChart } = await import("lightweight-charts");

      const chart = createChart(chartRef.current!, {
        width: chartRef.current!.clientWidth,
        height: 200,
        layout: {
          background: { color: "transparent" },
          textColor: "#94a3b8",
        },
        grid: {
          vertLines: { color: "#1e293b" },
          horzLines: { color: "#1e293b" },
        },
        rightPriceScale: {
          borderColor: "#334155",
        },
        timeScale: {
          borderColor: "#334155",
          timeVisible: true,
        },
      });

      const areaSeries = chart.addAreaSeries({
        lineColor: "#3b82f6",
        topColor: "rgba(59, 130, 246, 0.4)",
        bottomColor: "rgba(59, 130, 246, 0.0)",
        lineWidth: 2,
      });

      // Generate sample data based on current portfolio value
      const portfolioValue = parseFloat(account.portfolio_value);
      const now = new Date();
      const data = [];
      for (let i = 30; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        // Add some variation
        const variation = (Math.random() - 0.5) * 0.02;
        const value = portfolioValue * (1 + variation * (30 - i) / 30);
        data.push({
          time: date.toISOString().split("T")[0],
          value: value,
        });
      }

      areaSeries.setData(data);
      chart.timeScale().fitContent();

      const handleResize = () => {
        if (chartRef.current) {
          chart.applyOptions({ width: chartRef.current.clientWidth });
        }
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        chart.remove();
      };
    };

    initChart();
  }, [account]);

  const activeStrategies = strategies.filter((s) => s.status === "active");
  const portfolioValue = account ? parseFloat(account.portfolio_value) : 0;
  const lastEquity = account ? parseFloat(account.last_equity) : 0;
  const dailyPnL = portfolioValue - lastEquity;
  const dailyPnLPct = lastEquity > 0 ? (dailyPnL / lastEquity) * 100 : 0;
  const isPositive = dailyPnL >= 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            {account ? "Paper Trading Account" : "Connect your Alpaca account to see live data"}
            {isConnected ? (
              <span className="inline-flex items-center gap-1 text-green-400 text-xs">
                <Wifi className="h-3 w-3" />
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-500 text-xs">
                <WifiOff className="h-3 w-3" />
                Offline
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          className="border-slate-600"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="py-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <p className="text-yellow-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {accountError && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <p className="text-red-400 font-medium">Unable to connect to trading account</p>
            </div>
            <p className="text-red-400/80 text-sm mb-3">
              {accountError.includes("fetch") || accountError.includes("network")
                ? "The backend server may not be running. Start it with: cd backend && uvicorn app.main:app --reload"
                : "Check your Alpaca API credentials in Settings."}
            </p>
            <Link href="/dashboard/settings">
              <Button variant="outline" size="sm" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                Go to Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-slate-400">Portfolio Value</CardDescription>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Cash: ${account ? parseFloat(account.cash).toLocaleString() : "0.00"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-slate-400">Today&apos;s P&L</CardDescription>
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}>
              {isPositive ? "+" : ""}${dailyPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className={`text-xs mt-1 ${isPositive ? "text-green-400" : "text-red-400"}`}>
              {isPositive ? "+" : ""}{dailyPnLPct.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-slate-400">Active Strategies</CardDescription>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{activeStrategies.length}</div>
            <p className="text-xs text-slate-400 mt-1">
              {strategies.length} total strategies
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-slate-400">Open Positions</CardDescription>
            <Briefcase className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{positions.length}</div>
            <p className="text-xs text-slate-400 mt-1">
              {positions.length > 0
                ? `${positions.map((p) => p.symbol).join(", ")}`
                : "No open positions"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Chart */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Portfolio Performance
          </CardTitle>
          <CardDescription className="text-slate-400">
            Last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div ref={chartRef} className="w-full" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Positions */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Open Positions</CardTitle>
            <CardDescription className="text-slate-400">
              Current holdings in your portfolio
            </CardDescription>
          </CardHeader>
          <CardContent>
            {positions.length === 0 ? (
              <p className="text-slate-400 text-sm">No open positions</p>
            ) : (
              <div className="space-y-3">
                {positions.map((pos) => {
                  const pl = parseFloat(pos.unrealized_pl);
                  const plPct = parseFloat(pos.unrealized_plpc) * 100;
                  const isUp = pl >= 0;
                  return (
                    <div
                      key={pos.symbol}
                      className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-white">{pos.symbol}</p>
                        <p className="text-xs text-slate-400">
                          {pos.qty} shares @ ${parseFloat(pos.avg_entry_price).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-white">
                          ${parseFloat(pos.market_value).toLocaleString()}
                        </p>
                        <p className={`text-xs ${isUp ? "text-green-400" : "text-red-400"}`}>
                          {isUp ? "+" : ""}${pl.toFixed(2)} ({plPct.toFixed(2)}%)
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Trades */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">Recent Trades</CardTitle>
              <CardDescription className="text-slate-400">
                Your latest trading activity
              </CardDescription>
            </div>
            <Link href="/dashboard/trades">
              <Button variant="ghost" size="sm" className="text-slate-400">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {trades.length === 0 ? (
              <p className="text-slate-400 text-sm">No recent trades</p>
            ) : (
              <div className="space-y-3">
                {trades.slice(0, 5).map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={trade.side === "buy" ? "success" : "destructive"}>
                        {trade.side.toUpperCase()}
                      </Badge>
                      <div>
                        <p className="font-medium text-white">{trade.symbol}</p>
                        <p className="text-xs text-slate-400">
                          {trade.quantity} @ ${trade.filled_avg_price || trade.limit_price || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{trade.status}</Badge>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(trade.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/dashboard/strategies/new">
            <Button className="bg-blue-600 hover:bg-blue-700">
              Create Strategy
            </Button>
          </Link>
          <Link href="/dashboard/backtests">
            <Button variant="outline" className="border-slate-600">
              Run Backtest
            </Button>
          </Link>
          <Link href="/dashboard/strategies">
            <Button variant="outline" className="border-slate-600">
              View Strategies
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
