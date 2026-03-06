"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Play, Trash2, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { backtestsApi, strategiesApi, type Backtest, type Strategy } from "@/lib/api";
import { RunBacktestModal } from "./run-modal";

const statusConfig = {
  pending: { variant: "secondary" as const, icon: Clock, label: "Pending" },
  running: { variant: "warning" as const, icon: Loader2, label: "Running" },
  completed: { variant: "success" as const, icon: CheckCircle, label: "Completed" },
  failed: { variant: "destructive" as const, icon: XCircle, label: "Failed" },
};

export default function BacktestsPage() {
  const { getToken } = useAuth();
  const [backtests, setBacktests] = useState<Backtest[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRunModal, setShowRunModal] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [backtestToDelete, setBacktestToDelete] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const [backtestData, strategyData] = await Promise.all([
        backtestsApi.list(token),
        strategiesApi.list(token),
      ]);

      setBacktests(backtestData);
      setStrategies(strategyData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openDeleteDialog = (id: number) => {
    setBacktestToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (backtestToDelete === null) return;
    try {
      const token = await getToken();
      if (!token) return;
      await backtestsApi.delete(token, backtestToDelete);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete backtest");
    } finally {
      setDeleteDialogOpen(false);
      setBacktestToDelete(null);
    }
  };

  const handleRunComplete = () => {
    setShowRunModal(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Backtests</h1>
          <p className="text-slate-400">Test your strategies against historical data</p>
        </div>
        <Button
          onClick={() => setShowRunModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
          disabled={strategies.length === 0}
        >
          <Play className="h-4 w-4 mr-2" />
          Run Backtest
        </Button>
      </div>

      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-4">
            <p className="text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {strategies.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No strategies yet</h3>
            <p className="text-slate-400 mb-4">
              Create a strategy first before running backtests
            </p>
            <Link href="/dashboard/strategies/new">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Create Strategy
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : backtests.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No backtests yet</h3>
            <p className="text-slate-400 mb-4">
              Run your first backtest to see how your strategy performs
            </p>
            <Button
              onClick={() => setShowRunModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Run Backtest
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {backtests.map((backtest) => {
            const StatusIcon = statusConfig[backtest.status].icon;
            const isPositive = (backtest.total_return ?? 0) >= 0;

            return (
              <Link key={backtest.id} href={`/dashboard/backtests/${backtest.id}`}>
                <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors cursor-pointer">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-white">
                          {backtest.strategy_name || `Strategy #${backtest.strategy_id}`}
                        </CardTitle>
                        <Badge variant={statusConfig[backtest.status].variant}>
                          <StatusIcon className={`h-3 w-3 mr-1 ${backtest.status === "running" ? "animate-spin" : ""}`} />
                          {statusConfig[backtest.status].label}
                        </Badge>
                      </div>
                      <CardDescription className="text-slate-400">
                        {backtest.start_date} to {backtest.end_date}
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-red-400"
                      onClick={(e) => {
                        e.preventDefault();
                        openDeleteDialog(backtest.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {backtest.status === "completed" ? (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Total Return</span>
                          <p className={`font-medium flex items-center gap-1 ${isPositive ? "text-green-400" : "text-red-400"}`}>
                            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            {backtest.total_return?.toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Sharpe Ratio</span>
                          <p className="text-white font-medium">{backtest.sharpe_ratio?.toFixed(2) ?? "-"}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Max Drawdown</span>
                          <p className="text-red-400 font-medium">{backtest.max_drawdown?.toFixed(2)}%</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Win Rate</span>
                          <p className="text-white font-medium">{backtest.win_rate?.toFixed(1)}%</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Final Value</span>
                          <p className="text-white font-medium">${backtest.final_value?.toLocaleString()}</p>
                        </div>
                      </div>
                    ) : backtest.status === "failed" ? (
                      <p className="text-red-400 text-sm">{backtest.error_message}</p>
                    ) : (
                      <p className="text-slate-400 text-sm">
                        Initial capital: ${backtest.initial_capital.toLocaleString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {showRunModal && (
        <RunBacktestModal
          strategies={strategies}
          onClose={() => setShowRunModal(false)}
          onComplete={handleRunComplete}
        />
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Backtest"
        description="Are you sure you want to delete this backtest? This action cannot be undone."
        onConfirm={handleDelete}
        variant="destructive"
        confirmLabel="Delete"
      />
    </div>
  );
}
