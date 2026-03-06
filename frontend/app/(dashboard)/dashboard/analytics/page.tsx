"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Target,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  analyticsApi,
  strategiesApi,
  type PerformanceData,
  type Strategy,
} from "@/lib/api";

const PERIODS = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "1y", label: "1 Year" },
  { value: "all", label: "All Time" },
];

export default function AnalyticsPage() {
  const { getToken } = useAuth();
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("30d");
  const [strategyId, setStrategyId] = useState<number | undefined>(undefined);
  const chartRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const [perfData, strategiesData] = await Promise.all([
        analyticsApi.getPerformance(token, period, strategyId),
        strategiesApi.list(token),
      ]);

      setPerformance(perfData);
      setStrategies(strategiesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, strategyId]);

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current || !performance || performance.dates.length === 0) return;

    const initChart = async () => {
      const { createChart } = await import("lightweight-charts");

      // Clear previous chart
      chartRef.current!.innerHTML = "";

      const chart = createChart(chartRef.current!, {
        width: chartRef.current!.clientWidth,
        height: 300,
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

      const data = performance.dates.map((date, i) => ({
        time: date,
        value: performance.cumulative_returns[i],
      }));

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
  }, [performance]);

  const metrics = performance?.metrics;
  const totalReturn = metrics?.total_return;
  const isPositive = (totalReturn ?? 0) >= 0;

  if (loading && !performance) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 mt-1">
            Performance insights from your backtests
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          className="border-slate-600"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
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

      {/* Filters */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            {/* Period selector */}
            <div>
              <label className="text-sm text-slate-400 block mb-2">Time Period</label>
              <div className="flex gap-1">
                {PERIODS.map((p) => (
                  <Button
                    key={p.value}
                    variant={period === p.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPeriod(p.value)}
                    className={period === p.value ? "bg-blue-600" : "border-slate-600"}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Strategy filter */}
            <div>
              <label className="text-sm text-slate-400 block mb-2">Strategy</label>
              <select
                value={strategyId ?? ""}
                onChange={(e) => setStrategyId(e.target.value ? Number(e.target.value) : undefined)}
                className="bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-white"
              >
                <option value="">All Strategies</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-slate-400">Total Return</CardDescription>
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}>
              {totalReturn !== null && totalReturn !== undefined
                ? `${isPositive ? "+" : ""}${totalReturn.toFixed(2)}%`
                : "N/A"}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Based on {performance?.backtest_count ?? 0} backtests
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-slate-400">Sharpe Ratio</CardDescription>
            <BarChart3 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {metrics?.sharpe_ratio !== null && metrics?.sharpe_ratio !== undefined
                ? metrics.sharpe_ratio.toFixed(2)
                : "N/A"}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Risk-adjusted return
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-slate-400">Max Drawdown</CardDescription>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {metrics?.max_drawdown !== null && metrics?.max_drawdown !== undefined
                ? `-${metrics.max_drawdown.toFixed(2)}%`
                : "N/A"}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Largest peak-to-trough decline
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-slate-400">Win Rate</CardDescription>
            <Target className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {metrics?.win_rate !== null && metrics?.win_rate !== undefined
                ? `${metrics.win_rate.toFixed(1)}%`
                : "N/A"}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {metrics?.total_trades ?? 0} total trades
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Cumulative Returns
          </CardTitle>
          <CardDescription className="text-slate-400">
            Performance over {PERIODS.find((p) => p.value === period)?.label.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {performance?.dates.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-slate-400">
              No backtest data available for this period
            </div>
          ) : (
            <div ref={chartRef} className="w-full" />
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Explore More</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <a href="/dashboard/journal">
            <Button variant="outline" className="border-slate-600">
              Trade Journal
            </Button>
          </a>
          <a href="/dashboard/compare">
            <Button variant="outline" className="border-slate-600">
              Compare Strategies
            </Button>
          </a>
          <a href="/dashboard/backtests">
            <Button variant="outline" className="border-slate-600">
              View Backtests
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
