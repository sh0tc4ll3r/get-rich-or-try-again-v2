"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tradesApi, type Trade } from "@/lib/api";

const statusConfig: Record<string, { variant: "default" | "secondary" | "success" | "destructive" | "warning"; label: string }> = {
  pending: { variant: "secondary", label: "Pending" },
  submitted: { variant: "warning", label: "Submitted" },
  partial: { variant: "warning", label: "Partial" },
  filled: { variant: "success", label: "Filled" },
  canceled: { variant: "destructive", label: "Canceled" },
  rejected: { variant: "destructive", label: "Rejected" },
};

const sourceConfig: Record<string, { variant: "default" | "secondary" | "success" | "destructive" | "warning"; label: string }> = {
  paper: { variant: "default", label: "Paper" },
  backtest: { variant: "secondary", label: "Backtest" },
  manual: { variant: "warning", label: "Manual" },
  strategy: { variant: "success", label: "Strategy" },
};

export default function TradesPage() {
  const { getToken } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | undefined>(undefined);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const data = await tradesApi.list(token, sourceFilter, 100);
      setTrades(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trades");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, [sourceFilter]);

  const handleCancel = async (tradeId: number) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    try {
      const token = await getToken();
      if (!token) return;
      await tradesApi.cancel(token, tradeId);
      fetchTrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel order");
    }
  };

  // Calculate summary stats
  const filledTrades = trades.filter((t) => t.status === "filled");
  const buyTrades = filledTrades.filter((t) => t.side === "buy");
  const sellTrades = filledTrades.filter((t) => t.side === "sell");

  if (loading && trades.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading trades...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trade History</h1>
          <p className="text-slate-400">View all your trading activity</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTrades}
          className="border-slate-600"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-4">
            <p className="text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Total Trades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{trades.length}</div>
            <p className="text-xs text-slate-400">{filledTrades.length} filled</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Buy Orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{buyTrades.length}</div>
            <p className="text-xs text-slate-400">
              {trades.filter((t) => t.side === "buy").length} total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Sell Orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{sellTrades.length}</div>
            <p className="text-xs text-slate-400">
              {trades.filter((t) => t.side === "sell").length} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <CardTitle className="text-sm text-white">Filter by Source</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={sourceFilter === undefined ? "default" : "outline"}
              onClick={() => setSourceFilter(undefined)}
              className={sourceFilter === undefined ? "bg-blue-600" : "border-slate-600"}
            >
              All
            </Button>
            {Object.entries(sourceConfig).map(([key, config]) => (
              <Button
                key={key}
                size="sm"
                variant={sourceFilter === key ? "default" : "outline"}
                onClick={() => setSourceFilter(key)}
                className={sourceFilter === key ? "bg-blue-600" : "border-slate-600"}
              >
                {config.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trades List */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Orders</CardTitle>
          <CardDescription className="text-slate-400">
            {trades.length} {trades.length === 1 ? "order" : "orders"} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No trades found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-slate-700">
                    <th className="pb-3 text-slate-400 font-medium">Symbol</th>
                    <th className="pb-3 text-slate-400 font-medium">Side</th>
                    <th className="pb-3 text-slate-400 font-medium">Type</th>
                    <th className="pb-3 text-slate-400 font-medium text-right">Qty</th>
                    <th className="pb-3 text-slate-400 font-medium text-right">Price</th>
                    <th className="pb-3 text-slate-400 font-medium">Status</th>
                    <th className="pb-3 text-slate-400 font-medium">Source</th>
                    <th className="pb-3 text-slate-400 font-medium">Date</th>
                    <th className="pb-3 text-slate-400 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {trades.map((trade) => {
                    const status = statusConfig[trade.status] || { variant: "secondary" as const, label: trade.status };
                    const source = sourceConfig[trade.source] || { variant: "secondary" as const, label: trade.source };
                    const isBuy = trade.side === "buy";
                    const canCancel = ["pending", "partial"].includes(trade.status);

                    return (
                      <tr key={trade.id} className="text-sm">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            {isBuy ? (
                              <ArrowUpCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <ArrowDownCircle className="h-4 w-4 text-red-400" />
                            )}
                            <span className="font-medium text-white">{trade.symbol}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <Badge variant={isBuy ? "success" : "destructive"}>
                            {trade.side.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 text-slate-300">{trade.order_type}</td>
                        <td className="py-3 text-right text-white">
                          {parseFloat(trade.filled_quantity) > 0 ? (
                            <>
                              {trade.filled_quantity}
                              {parseFloat(trade.filled_quantity) < parseFloat(trade.quantity) && (
                                <span className="text-slate-400">/{trade.quantity}</span>
                              )}
                            </>
                          ) : (
                            trade.quantity
                          )}
                        </td>
                        <td className="py-3 text-right text-white">
                          {trade.filled_avg_price
                            ? `$${parseFloat(trade.filled_avg_price).toFixed(2)}`
                            : trade.limit_price
                            ? `$${parseFloat(trade.limit_price).toFixed(2)}`
                            : "-"}
                        </td>
                        <td className="py-3">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="py-3">
                          <Badge variant={source.variant}>{source.label}</Badge>
                        </td>
                        <td className="py-3 text-slate-400">
                          {new Date(trade.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          {canCancel && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-slate-400 hover:text-red-400"
                              onClick={() => handleCancel(trade.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
