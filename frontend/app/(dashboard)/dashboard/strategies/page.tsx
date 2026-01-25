"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Plus, Play, Pause, Square, Trash2, Settings, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export default function StrategiesPage() {
  const { getToken } = useAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState<number | null>(null);
  const [executionResult, setExecutionResult] = useState<string | null>(null);

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

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this strategy?")) return;
    try {
      const token = await getToken();
      if (!token) return;
      await strategiesApi.delete(token, id);
      fetchStrategies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete strategy");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading strategies...</div>
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
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-12 text-center">
            <Settings className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No strategies yet</h3>
            <p className="text-slate-400 mb-4">
              Create your first trading strategy to get started
            </p>
            <Link href="/dashboard/strategies/new">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Strategy
              </Button>
            </Link>
          </CardContent>
        </Card>
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
                      onClick={() => handleDelete(strategy.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
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
    </div>
  );
}
