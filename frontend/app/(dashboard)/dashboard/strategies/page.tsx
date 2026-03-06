"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Plus, Play, Pause, Square, Trash2, Settings, Zap, Loader2, Bot, TrendingUp, BarChart, RefreshCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { strategiesApi, executionApi, type Strategy } from "@/lib/api";

const statusVariant = {
  draft: "secondary",
  active: "success",
  paused: "warning",
  stopped: "destructive",
} as const;

const statusLabel = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  stopped: "Stopped",
};

// Strategy templates for quick start
const strategyTemplates = [
  {
    id: "conservative-growth",
    name: "Conservative Growth",
    description: "Low-risk RSI strategy on S&P 500 ETF. Buys when oversold, sells when overbought.",
    icon: <TrendingUp className="h-6 w-6 text-green-400" />,
    color: "green",
    config: {
      strategy_type: "rsi",
      symbols: ["SPY"],
      parameters: { rsi_period: 14, oversold_level: 30, overbought_level: 70 },
      max_position_size: 5,
      max_daily_loss: 2,
      stop_loss_pct: 3,
      take_profit_pct: 5,
    },
  },
  {
    id: "momentum-hunter",
    name: "Momentum Hunter",
    description: "Aggressive momentum strategy on tech stocks. Rides strong upward trends.",
    icon: <Zap className="h-6 w-6 text-blue-400" />,
    color: "blue",
    config: {
      strategy_type: "momentum",
      symbols: ["AAPL", "MSFT", "GOOGL"],
      parameters: { lookback_period: 20, momentum_threshold: 5 },
      max_position_size: 10,
      max_daily_loss: 5,
      stop_loss_pct: 5,
      take_profit_pct: 10,
    },
  },
  {
    id: "mean-reversion",
    name: "Mean Reversion Play",
    description: "Captures price reversions to average. Works well in volatile markets.",
    icon: <RefreshCw className="h-6 w-6 text-purple-400" />,
    color: "purple",
    config: {
      strategy_type: "mean_reversion",
      symbols: ["QQQ", "IWM"],
      parameters: { sma_period: 20, deviation_threshold: 2 },
      max_position_size: 8,
      max_daily_loss: 4,
      stop_loss_pct: 4,
      take_profit_pct: 6,
    },
  },
];

export default function StrategiesPage() {
  const { getToken } = useAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState<number | null>(null);
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [strategyToDelete, setStrategyToDelete] = useState<number | null>(null);
  const [togglingAutoExecute, setTogglingAutoExecute] = useState<number | null>(null);

  const fetchStrategies = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await strategiesApi.list(token);
      setStrategies(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load strategies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  const handleDeploy = async (id: number) => {
    try {
      const token = await getToken();
      if (!token) return;
      await strategiesApi.deploy(token, id);
      fetchStrategies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deploy strategy");
    }
  };

  const handlePause = async (id: number) => {
    try {
      const token = await getToken();
      if (!token) return;
      await strategiesApi.pause(token, id);
      fetchStrategies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause strategy");
    }
  };

  const handleStop = async (id: number) => {
    try {
      const token = await getToken();
      if (!token) return;
      await strategiesApi.stop(token, id);
      fetchStrategies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop strategy");
    }
  };

  const openDeleteDialog = (id: number) => {
    setStrategyToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (strategyToDelete === null) return;
    try {
      const token = await getToken();
      if (!token) return;
      await strategiesApi.delete(token, strategyToDelete);
      fetchStrategies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete strategy");
    } finally {
      setDeleteDialogOpen(false);
      setStrategyToDelete(null);
    }
  };

  const handleExecute = async (id: number) => {
    try {
      setExecuting(id);
      setExecutionResult(null);
      const token = await getToken();
      if (!token) return;
      const result = await executionApi.execute(token, id);
      setExecutionResult(
        `${result.strategy_name}: ${result.signals.length} signal(s) generated`
      );
      setTimeout(() => setExecutionResult(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute strategy");
    } finally {
      setExecuting(null);
    }
  };

  const handleToggleAutoExecute = async (id: number) => {
    try {
      setTogglingAutoExecute(id);
      const token = await getToken();
      if (!token) return;
      await strategiesApi.toggleAutoExecute(token, id);
      fetchStrategies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle auto-execution");
    } finally {
      setTogglingAutoExecute(null);
    }
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
          <h1 className="text-2xl font-bold text-white">Strategies</h1>
          <p className="text-slate-400">Create and manage your trading strategies</p>
        </div>
        <Link href="/dashboard/strategies/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Strategy
          </Button>
        </Link>
      </div>

      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-4">
            <p className="text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {executionResult && (
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="py-4">
            <p className="text-green-400">{executionResult}</p>
          </CardContent>
        </Card>
      )}

      {strategies.length === 0 ? (
        <div className="space-y-6">
          {/* Empty state header */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-8 text-center">
              <Settings className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No strategies yet</h3>
              <p className="text-slate-400 mb-4">
                Start with a template below or create a custom strategy
              </p>
              <Link href="/dashboard/strategies/new">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom Strategy
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Strategy templates */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Quick Start Templates</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {strategyTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`bg-slate-800/50 border-slate-700 hover:border-${template.color}-500/50 transition-colors cursor-pointer group`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-${template.color}-500/20`}>
                        {template.icon}
                      </div>
                      <CardTitle className="text-white text-base">{template.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-slate-400 mb-4">
                      {template.description}
                    </CardDescription>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {template.config.symbols.map((symbol) => (
                        <Badge key={symbol} variant="secondary" className="text-xs">
                          {symbol}
                        </Badge>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-4">
                      <div>Position: {template.config.max_position_size}%</div>
                      <div>Daily Loss: {template.config.max_daily_loss}%</div>
                    </div>
                    <Link
                      href={`/dashboard/strategies/new?template=${template.id}`}
                    >
                      <Button
                        variant="outline"
                        className="w-full border-slate-600 group-hover:border-slate-500"
                      >
                        Use Template
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {strategies.map((strategy) => (
            <Card key={strategy.id} className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-white">{strategy.name}</CardTitle>
                    <Badge variant={statusVariant[strategy.status]}>
                      {statusLabel[strategy.status]}
                    </Badge>
                  </div>
                  <CardDescription className="text-slate-400">
                    {strategy.strategy_type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())} Strategy
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {strategy.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                      onClick={() => handleDeploy(strategy.id)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Deploy
                    </Button>
                  )}
                  {strategy.status === "active" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                        onClick={() => handleExecute(strategy.id)}
                        disabled={executing === strategy.id}
                      >
                        {executing === strategy.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4 mr-1" />
                        )}
                        Execute
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                        onClick={() => handlePause(strategy.id)}
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        onClick={() => handleStop(strategy.id)}
                      >
                        <Square className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    </>
                  )}
                  {strategy.status === "paused" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                        onClick={() => handleDeploy(strategy.id)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Resume
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        onClick={() => handleStop(strategy.id)}
                      >
                        <Square className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    </>
                  )}
                  {strategy.status !== "active" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-red-400"
                      onClick={() => openDeleteDialog(strategy.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {strategy.status === "active" && (
                  <div className="flex items-center gap-3 mb-4 p-3 bg-slate-900/50 rounded-lg">
                    <Bot className="h-5 w-5 text-blue-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Auto-Execution</p>
                      <p className="text-xs text-slate-400">
                        {strategy.auto_execute
                          ? "Orders will be placed automatically when signals are generated"
                          : "Signals will be generated but orders must be placed manually"}
                      </p>
                    </div>
                    <Switch
                      checked={strategy.auto_execute}
                      onCheckedChange={() => handleToggleAutoExecute(strategy.id)}
                      disabled={togglingAutoExecute === strategy.id}
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Symbols</span>
                    <p className="text-white font-medium">{strategy.symbols.join(", ")}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Max Position</span>
                    <p className="text-white font-medium">{(strategy.max_position_size * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Daily Loss Limit</span>
                    <p className="text-white font-medium">{(strategy.max_daily_loss * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Created</span>
                    <p className="text-white font-medium">
                      {new Date(strategy.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Strategy"
        description="Are you sure you want to delete this strategy? This action cannot be undone."
        onConfirm={handleDelete}
        variant="destructive"
        confirmLabel="Delete"
      />
    </div>
  );
}
