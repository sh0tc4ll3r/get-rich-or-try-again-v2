"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { backtestsApi, type Strategy } from "@/lib/api";

interface RunBacktestModalProps {
  strategies: Strategy[];
  onClose: () => void;
  onComplete: () => void;
}

export function RunBacktestModal({ strategies, onClose, onComplete }: RunBacktestModalProps) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [strategyId, setStrategyId] = useState(strategies[0]?.id.toString() || "");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [initialCapital, setInitialCapital] = useState(100000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const token = await getToken();
      if (!token) {
        setError("Not authenticated");
        return;
      }

      await backtestsApi.run(token, {
        strategy_id: parseInt(strategyId),
        start_date: startDate,
        end_date: endDate,
        initial_capital: initialCapital,
      });

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run backtest");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-slate-800 border-slate-700 w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Run Backtest</CardTitle>
            <CardDescription className="text-slate-400">
              Test your strategy against historical data
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="strategy" className="text-slate-300">
                Strategy
              </Label>
              <Select
                id="strategy"
                value={strategyId}
                onChange={(e) => setStrategyId(e.target.value)}
              >
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-slate-300">
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-slate-300">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capital" className="text-slate-300">
                Initial Capital ($)
              </Label>
              <Input
                id="capital"
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                min={1000}
                max={10000000}
                step={1000}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-slate-600"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Running..." : "Run Backtest"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
