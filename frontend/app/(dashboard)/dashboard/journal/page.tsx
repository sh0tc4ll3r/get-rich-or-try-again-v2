"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  BookOpen,
  Edit2,
  Save,
  X,
  AlertCircle,
  RefreshCw,
  Filter,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { tradesApi, type Trade } from "@/lib/api";

const PERIODS = [
  { value: "", label: "All Time" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
];

const NOTE_FILTERS = [
  { value: "all", label: "All Trades" },
  { value: "with_notes", label: "With Notes" },
  { value: "without_notes", label: "Without Notes" },
];

export default function JournalPage() {
  const { getToken } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Filters
  const [noteFilter, setNoteFilter] = useState("all");
  const [symbolFilter, setSymbolFilter] = useState("");
  const [sideFilter, setSideFilter] = useState<"all" | "buy" | "sell">("all");

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const data = await tradesApi.list(token, undefined, 100);
      setTrades(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trades");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const startEditing = (trade: Trade) => {
    setEditingId(trade.id);
    setEditNotes(trade.notes || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditNotes("");
  };

  const saveNotes = async (tradeId: number) => {
    try {
      setSaving(true);
      const token = await getToken();
      if (!token) return;

      const updatedTrade = await tradesApi.updateNotes(
        token,
        tradeId,
        editNotes.trim() || null
      );

      setTrades((prev) =>
        prev.map((t) => (t.id === tradeId ? updatedTrade : t))
      );
      setEditingId(null);
      setEditNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  // Apply filters
  const filteredTrades = trades.filter((trade) => {
    // Note filter
    if (noteFilter === "with_notes" && !trade.notes) return false;
    if (noteFilter === "without_notes" && trade.notes) return false;

    // Symbol filter
    if (symbolFilter && !trade.symbol.toLowerCase().includes(symbolFilter.toLowerCase())) {
      return false;
    }

    // Side filter
    if (sideFilter !== "all" && trade.side !== sideFilter) return false;

    return true;
  });

  // Get unique symbols for autocomplete
  const uniqueSymbols = Array.from(new Set(trades.map((t) => t.symbol)));

  if (loading && trades.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading trade journal...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BookOpen className="h-8 w-8" />
            Trade Journal
          </h1>
          <p className="text-slate-400 mt-1">
            Document and reflect on your trades
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
          <div className="flex flex-wrap items-center gap-4">
            <Filter className="h-4 w-4 text-slate-400" />

            {/* Note filter */}
            <div>
              <select
                value={noteFilter}
                onChange={(e) => setNoteFilter(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-white"
              >
                {NOTE_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Symbol filter */}
            <div>
              <input
                type="text"
                placeholder="Filter by symbol..."
                value={symbolFilter}
                onChange={(e) => setSymbolFilter(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-white w-40"
                list="symbols"
              />
              <datalist id="symbols">
                {uniqueSymbols.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            {/* Side filter */}
            <div className="flex gap-1">
              {(["all", "buy", "sell"] as const).map((side) => (
                <Button
                  key={side}
                  variant={sideFilter === side ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSideFilter(side)}
                  className={sideFilter === side ? "bg-blue-600" : "border-slate-600"}
                >
                  {side.charAt(0).toUpperCase() + side.slice(1)}
                </Button>
              ))}
            </div>

            {/* Stats */}
            <div className="ml-auto text-sm text-slate-400">
              {filteredTrades.length} of {trades.length} trades
              {" | "}
              {trades.filter((t) => t.notes).length} with notes
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trades Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Trades</CardTitle>
          <CardDescription className="text-slate-400">
            Click the edit icon to add notes to any trade
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTrades.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No trades match your filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-2 text-slate-400 text-sm font-medium">Date</th>
                    <th className="text-left py-3 px-2 text-slate-400 text-sm font-medium">Symbol</th>
                    <th className="text-left py-3 px-2 text-slate-400 text-sm font-medium">Side</th>
                    <th className="text-left py-3 px-2 text-slate-400 text-sm font-medium">Qty</th>
                    <th className="text-left py-3 px-2 text-slate-400 text-sm font-medium">Price</th>
                    <th className="text-left py-3 px-2 text-slate-400 text-sm font-medium">Status</th>
                    <th className="text-left py-3 px-2 text-slate-400 text-sm font-medium">Notes</th>
                    <th className="text-right py-3 px-2 text-slate-400 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade) => (
                    <tr key={trade.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-2 text-white text-sm">
                        {new Date(trade.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 text-white font-medium">{trade.symbol}</td>
                      <td className="py-3 px-2">
                        <Badge variant={trade.side === "buy" ? "success" : "destructive"}>
                          {trade.side.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-white text-sm">{trade.quantity}</td>
                      <td className="py-3 px-2 text-white text-sm">
                        ${trade.filled_avg_price || trade.limit_price || "-"}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="secondary">{trade.status}</Badge>
                      </td>
                      <td className="py-3 px-2 max-w-xs">
                        {editingId === trade.id ? (
                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-sm text-white resize-none"
                            rows={2}
                            placeholder="Add notes about this trade..."
                            autoFocus
                          />
                        ) : (
                          <div className="text-sm text-slate-300">
                            {trade.notes ? (
                              <div className="flex items-start gap-1">
                                <MessageSquare className="h-3 w-3 mt-1 text-blue-400 flex-shrink-0" />
                                <span className="line-clamp-2">{trade.notes}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">No notes</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {editingId === trade.id ? (
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => saveNotes(trade.id)}
                              disabled={saving}
                              className="text-green-400 hover:text-green-300"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditing}
                              disabled={saving}
                              className="text-slate-400 hover:text-slate-300"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(trade)}
                            className="text-slate-400 hover:text-white"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">Journaling Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400 space-y-2">
          <p>Record what you were thinking when you made the trade.</p>
          <p>Note any emotions: fear, greed, confidence, doubt.</p>
          <p>Review your notes regularly to identify patterns in your decision making.</p>
        </CardContent>
      </Card>
    </div>
  );
}
