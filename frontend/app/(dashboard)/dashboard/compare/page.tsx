"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  GitCompare,
  AlertCircle,
  RefreshCw,
  Check,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  analyticsApi,
  backtestsApi,
  type Backtest,
  type StrategyComparisonData,
} from "@/lib/api";

const COLORS = [
  { line: "#3b82f6", area: "rgba(59, 130, 246, 0.2)" },   // blue
  { line: "#10b981", area: "rgba(16, 185, 129, 0.2)" },   // green
  { line: "#f59e0b", area: "rgba(245, 158, 11, 0.2)" },   // amber
  { line: "#ef4444", area: "rgba(239, 68, 68, 0.2)" },    // red
];

export default function ComparePage() {
  const { getToken } = useAuth();
  const [backtests, setBacktests] = useState<Backtest[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [comparison, setComparison] = useState<StrategyComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const fetchBacktests = async () => {
    try {
      setError(null);
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const data = await backtestsApi.list(token);
      // Only show completed backtests
      setBacktests(data.filter((b) => b.status === "completed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load backtests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBacktests();
  }, []);

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 4) {
        return prev; // Max 4 selections
      }
      return [...prev, id];
    });
  };

  const runComparison = async () => {
    if (selectedIds.length < 2) return;

    try {
      setComparing(true);
      setError(null);
      const token = await getToken();
      if (!token) return;

      const data = await analyticsApi.compareStrategies(token, selectedIds);
      setComparison(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compare strategies");
    } finally {
      setComparing(false);
    }
  };

  // Initialize comparison chart
  useEffect(() => {
    if (!chartRef.current || !comparison || comparison.series.length === 0) return;

    const initChart = async () => {
      const { createChart } = await import("lightweight-charts");

      // Clear previous chart
      chartRef.current!.innerHTML = "";

      const chart = createChart(chartRef.current!, {
        width: chartRef.current!.clientWidth,
        height: 350,
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

      // Add a line series for each backtest
      comparison.series.forEach((series, index) => {
        const color = COLORS[index % COLORS.length];
        const lineSeries = chart.addLineSeries({
          color: color.line,
          lineWidth: 2,
          title: series.label,
        });

        const data = series.data.map((point) => ({
          time: point.date,
          value: point.value,
        }));

        lineSeries.setData(data);
      });

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
  }, [comparison]);

  const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return "N/A";
    return `${value.toFixed(2)}%`;
  };

  const formatNumber = (value: number | null) => {
    if (value === null || value === undefined) return "N/A";
    return value.toFixed(2);
  };

  if (loading && backtests.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading backtests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <GitCompare className="h-8 w-8" />
            Strategy Comparison
          </h1>
          <p className="text-slate-400 mt-1">
            Compare performance across different backtests
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchBacktests}
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

      {/* Backtest Selector */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Select Backtests to Compare</CardTitle>
          <CardDescription className="text-slate-400">
            Choose 2-4 completed backtests ({selectedIds.length} selected)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backtests.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No completed backtests available. Run some backtests first.
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mb-4">
                {backtests.map((bt, index) => {
                  const isSelected = selectedIds.includes(bt.id);
                  const colorIndex = selectedIds.indexOf(bt.id);
                  const color = colorIndex >= 0 ? COLORS[colorIndex % COLORS.length] : null;

                  return (
                    <div
                      key={bt.id}
                      onClick={() => toggleSelection(bt.id)}
                      className={`
                        p-4 rounded-lg border cursor-pointer transition-all
                        ${isSelected
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-slate-600 bg-slate-900/50 hover:border-slate-500"
                        }
                        ${!isSelected && selectedIds.length >= 4 ? "opacity-50 cursor-not-allowed" : ""}
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {color && (
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: color.line }}
                              />
                            )}
                            <p className="font-medium text-white">
                              {bt.strategy_name || `Strategy #${bt.strategy_id}`}
                            </p>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {bt.start_date} to {bt.end_date}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Badge
                              variant={
                                bt.total_return && bt.total_return >= 0
                                  ? "success"
                                  : "destructive"
                              }
                            >
                              {formatPercent(bt.total_return)}
                            </Badge>
                            <Badge variant="secondary">
                              {bt.total_trades} trades
                            </Badge>
                          </div>
                        </div>
                        <div className="ml-2">
                          {isSelected ? (
                            <Check className="h-5 w-5 text-blue-400" />
                          ) : (
                            <div className="h-5 w-5 border border-slate-600 rounded" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                onClick={runComparison}
                disabled={selectedIds.length < 2 || comparing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {comparing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Comparing...
                  </>
                ) : (
                  <>
                    <GitCompare className="h-4 w-4 mr-2" />
                    Compare Selected ({selectedIds.length})
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Comparison Chart */}
      {comparison && comparison.series.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Performance Comparison</CardTitle>
            <CardDescription className="text-slate-400">
              Normalized equity curves (starting at 100%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-4">
              {comparison.series.map((series, index) => (
                <div key={series.backtest_id} className="flex items-center gap-2">
                  <div
                    className="w-4 h-1 rounded"
                    style={{ backgroundColor: COLORS[index % COLORS.length].line }}
                  />
                  <span className="text-sm text-slate-300">{series.label}</span>
                </div>
              ))}
            </div>
            <div ref={chartRef} className="w-full" />
          </CardContent>
        </Card>
      )}

      {/* Metrics Table */}
      {comparison && comparison.backtests.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Metrics Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-2 text-slate-400 text-sm font-medium">Metric</th>
                    {comparison.backtests.map((bt, index) => (
                      <th key={bt.id} className="text-right py-3 px-2 text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length].line }}
                          />
                          <span className="text-white">{bt.strategy_name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-3 px-2 text-slate-400">Total Return</td>
                    {comparison.backtests.map((bt) => (
                      <td
                        key={bt.id}
                        className={`py-3 px-2 text-right font-medium ${
                          bt.total_return && bt.total_return >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatPercent(bt.total_return)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-3 px-2 text-slate-400">Sharpe Ratio</td>
                    {comparison.backtests.map((bt) => (
                      <td key={bt.id} className="py-3 px-2 text-right text-white">
                        {formatNumber(bt.sharpe_ratio)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-3 px-2 text-slate-400">Sortino Ratio</td>
                    {comparison.backtests.map((bt) => (
                      <td key={bt.id} className="py-3 px-2 text-right text-white">
                        {formatNumber(bt.sortino_ratio)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-3 px-2 text-slate-400">Max Drawdown</td>
                    {comparison.backtests.map((bt) => (
                      <td key={bt.id} className="py-3 px-2 text-right text-red-400">
                        {bt.max_drawdown ? `-${formatPercent(bt.max_drawdown)}` : "N/A"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-3 px-2 text-slate-400">Win Rate</td>
                    {comparison.backtests.map((bt) => (
                      <td key={bt.id} className="py-3 px-2 text-right text-white">
                        {formatPercent(bt.win_rate)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-3 px-2 text-slate-400">Profit Factor</td>
                    {comparison.backtests.map((bt) => (
                      <td key={bt.id} className="py-3 px-2 text-right text-white">
                        {formatNumber(bt.profit_factor)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-2 text-slate-400">Total Trades</td>
                    {comparison.backtests.map((bt) => (
                      <td key={bt.id} className="py-3 px-2 text-right text-white">
                        {bt.total_trades ?? "N/A"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!comparison && selectedIds.length >= 2 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-12 text-center">
            <GitCompare className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">
              Click "Compare Selected" to see the comparison chart and metrics
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
