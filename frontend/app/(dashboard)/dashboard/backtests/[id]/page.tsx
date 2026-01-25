"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, DollarSign, Target, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { backtestsApi, type BacktestDetail } from "@/lib/api";

export default function BacktestDetailPage() {
  const params = useParams();
  const { getToken } = useAuth();
  const [backtest, setBacktest] = useState<BacktestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchBacktest = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const id = parseInt(params.id as string);
        const data = await backtestsApi.get(token, id);
        setBacktest(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load backtest");
      } finally {
        setLoading(false);
      }
    };
    fetchBacktest();
  }, [params.id]);

  // Initialize chart when data is loaded
  useEffect(() => {
    if (!backtest?.equity_curve || !chartRef.current) return;

    const initChart = async () => {
      const { createChart } = await import("lightweight-charts");

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

      const chartData = backtest.equity_curve.map((point) => ({
        time: point.date,
        value: point.equity,
      }));

      areaSeries.setData(chartData);
      chart.timeScale().fitContent();

      // Handle resize
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
  }, [backtest?.equity_curve]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading backtest...</div>
      </div>
    );
  }

  if (error || !backtest) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/backtests">
          <Button variant="ghost" size="sm" className="text-slate-400">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Backtests
          </Button>
        </Link>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-4">
            <p className="text-red-400">{error || "Backtest not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPositive = (backtest.total_return ?? 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/backtests">
          <Button variant="ghost" size="sm" className="text-slate-400">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {backtest.strategy_name || `Strategy #${backtest.strategy_id}`}
          </h1>
          <p className="text-slate-400">
            {backtest.start_date} to {backtest.end_date}
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              Total Return
            </div>
            <p className={`text-2xl font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}>
              {backtest.total_return?.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <Target className="h-4 w-4" />
              Sharpe Ratio
            </div>
            <p className="text-2xl font-bold text-white">
              {backtest.sharpe_ratio?.toFixed(2) ?? "-"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <AlertTriangle className="h-4 w-4" />
              Max Drawdown
            </div>
            <p className="text-2xl font-bold text-red-400">
              {backtest.max_drawdown?.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <DollarSign className="h-4 w-4" />
              Final Value
            </div>
            <p className="text-2xl font-bold text-white">
              ${backtest.final_value?.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Equity Chart */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Equity Curve</CardTitle>
          <CardDescription className="text-slate-400">
            Portfolio value over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div ref={chartRef} className="w-full" />
        </CardContent>
      </Card>

      {/* Additional Metrics */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Win Rate</span>
              <span className="text-white font-medium">{backtest.win_rate?.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Profit Factor</span>
              <span className="text-white font-medium">{backtest.profit_factor?.toFixed(2) ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sortino Ratio</span>
              <span className="text-white font-medium">{backtest.sortino_ratio?.toFixed(2) ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Trades</span>
              <span className="text-white font-medium">{backtest.total_trades ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Initial Capital</span>
              <span className="text-white font-medium">${backtest.initial_capital.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Strategy Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {backtest.parameters_snapshot && Object.entries(backtest.parameters_snapshot).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-slate-400">{key.replace(/_/g, " ")}</span>
                <span className="text-white font-medium">{value}</span>
              </div>
            ))}
            {(!backtest.parameters_snapshot || Object.keys(backtest.parameters_snapshot).length === 0) && (
              <p className="text-slate-500 text-sm">No parameters recorded</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trade Log */}
      {backtest.trade_log && backtest.trade_log.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Trade Log</CardTitle>
            <CardDescription className="text-slate-400">
              {backtest.trade_log.length} trades executed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left text-slate-400 pb-3 font-medium">Date</th>
                    <th className="text-left text-slate-400 pb-3 font-medium">Symbol</th>
                    <th className="text-left text-slate-400 pb-3 font-medium">Side</th>
                    <th className="text-right text-slate-400 pb-3 font-medium">Qty</th>
                    <th className="text-right text-slate-400 pb-3 font-medium">Price</th>
                    <th className="text-right text-slate-400 pb-3 font-medium">P&L</th>
                    <th className="text-left text-slate-400 pb-3 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {backtest.trade_log.map((trade, idx) => (
                    <tr key={idx} className="border-b border-slate-700/50">
                      <td className="py-3 text-slate-300">{trade.date}</td>
                      <td className="py-3 text-white font-medium">{trade.symbol}</td>
                      <td className="py-3">
                        <Badge variant={trade.side === "buy" ? "success" : "destructive"}>
                          {trade.side.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 text-right text-slate-300">{trade.qty}</td>
                      <td className="py-3 text-right text-slate-300">${trade.price.toFixed(2)}</td>
                      <td className={`py-3 text-right font-medium ${
                        trade.pnl === undefined ? "text-slate-500" :
                        trade.pnl >= 0 ? "text-green-400" : "text-red-400"
                      }`}>
                        {trade.pnl !== undefined ? (
                          <>
                            {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                            <span className="text-xs ml-1">
                              ({trade.pnl_pct?.toFixed(1)}%)
                            </span>
                          </>
                        ) : "-"}
                      </td>
                      <td className="py-3 text-slate-400 text-xs">{trade.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
