"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, Info, Plus, X, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { strategiesApi, type StrategyType, type CreateStrategyRequest } from "@/lib/api";

// Strategy templates (same as strategies page)
const strategyTemplates: Record<string, {
  name: string;
  strategy_type: string;
  symbols: string[];
  parameters: Record<string, number>;
  max_position_size: number;
  max_daily_loss: number;
  stop_loss_pct: number;
  take_profit_pct: number;
}> = {
  "conservative-growth": {
    name: "Conservative Growth",
    strategy_type: "rsi",
    symbols: ["SPY"],
    parameters: { rsi_period: 14, oversold_level: 30, overbought_level: 70 },
    max_position_size: 5,
    max_daily_loss: 2,
    stop_loss_pct: 3,
    take_profit_pct: 5,
  },
  "momentum-hunter": {
    name: "Momentum Hunter",
    strategy_type: "momentum",
    symbols: ["AAPL", "MSFT", "GOOGL"],
    parameters: { lookback_period: 20, momentum_threshold: 5 },
    max_position_size: 10,
    max_daily_loss: 5,
    stop_loss_pct: 5,
    take_profit_pct: 10,
  },
  "mean-reversion": {
    name: "Mean Reversion Play",
    strategy_type: "mean_reversion",
    symbols: ["QQQ", "IWM"],
    parameters: { sma_period: 20, deviation_threshold: 2 },
    max_position_size: 8,
    max_daily_loss: 4,
    stop_loss_pct: 4,
    take_profit_pct: 6,
  },
};

export default function NewStrategyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();

  const [strategyTypes, setStrategyTypes] = useState<StrategyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateApplied, setTemplateApplied] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [strategyType, setStrategyType] = useState("");
  const [symbols, setSymbols] = useState<string[]>([]);
  const [symbolInput, setSymbolInput] = useState("");
  const [parameters, setParameters] = useState<Record<string, number>>({});
  const [maxPositionSize, setMaxPositionSize] = useState(10);
  const [maxDailyLoss, setMaxDailyLoss] = useState(5);
  const [stopLossPct, setStopLossPct] = useState<number | "">("");
  const [takeProfitPct, setTakeProfitPct] = useState<number | "">("");

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const types = await strategiesApi.getTypes();
        setStrategyTypes(types);

        // Check for template in URL
        const templateId = searchParams.get("template");
        const template = templateId ? strategyTemplates[templateId] : null;

        if (template) {
          // Apply template values
          setName(template.name);
          setStrategyType(template.strategy_type);
          setSymbols(template.symbols);
          setParameters(template.parameters);
          setMaxPositionSize(template.max_position_size);
          setMaxDailyLoss(template.max_daily_loss);
          setStopLossPct(template.stop_loss_pct);
          setTakeProfitPct(template.take_profit_pct);
          setTemplateApplied(true);
        } else if (types.length > 0) {
          setStrategyType(types[0].id);
          // Set default parameters
          const defaults: Record<string, number> = {};
          types[0].parameters.forEach((p) => {
            defaults[p.name] = p.default;
          });
          setParameters(defaults);
        }
      } catch (err) {
        setError("Failed to load strategy types");
      } finally {
        setLoading(false);
      }
    };
    fetchTypes();
  }, [searchParams]);

  const selectedType = strategyTypes.find((t) => t.id === strategyType);

  const handleTypeChange = (typeId: string) => {
    setStrategyType(typeId);
    const type = strategyTypes.find((t) => t.id === typeId);
    if (type) {
      const defaults: Record<string, number> = {};
      type.parameters.forEach((p) => {
        defaults[p.name] = p.default;
      });
      setParameters(defaults);
    }
  };

  const addSymbol = () => {
    const symbol = symbolInput.trim().toUpperCase();
    if (symbol && !symbols.includes(symbol) && /^[A-Z]{1,5}$/.test(symbol)) {
      setSymbols([...symbols, symbol]);
      setSymbolInput("");
    }
  };

  const removeSymbol = (symbol: string) => {
    setSymbols(symbols.filter((s) => s !== symbol));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter a strategy name");
      return;
    }
    if (symbols.length === 0) {
      setError("Please add at least one symbol");
      return;
    }

    setSaving(true);

    try {
      const token = await getToken();
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const request: CreateStrategyRequest = {
        name: name.trim(),
        strategy_type: strategyType,
        symbols,
        parameters,
        max_position_size: maxPositionSize / 100,
        max_daily_loss: maxDailyLoss / 100,
        stop_loss_pct: stopLossPct ? Number(stopLossPct) / 100 : null,
        take_profit_pct: takeProfitPct ? Number(takeProfitPct) / 100 : null,
      };

      await strategiesApi.create(token, request);
      router.push("/dashboard/strategies");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create strategy");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/strategies">
          <Button variant="ghost" size="sm" className="text-slate-400">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Strategy</h1>
          <p className="text-slate-400">Configure your trading strategy</p>
        </div>
      </div>

      {templateApplied && (
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="py-4 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-blue-400 font-medium">Template Applied</p>
              <p className="text-slate-400 text-sm">
                Form pre-filled with template values. Feel free to customize!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-4">
            <p className="text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Basic Information</CardTitle>
            <CardDescription className="text-slate-400">
              Name your strategy and choose a type
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">
                Strategy Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Momentum Strategy"
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type" className="text-slate-300">
                Strategy Type
              </Label>
              <Select
                id="type"
                value={strategyType}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                {strategyTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </Select>
              {selectedType && (
                <p className="text-sm text-slate-400 flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {selectedType.description}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Symbols */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Trading Symbols</CardTitle>
            <CardDescription className="text-slate-400">
              Add the stock symbols you want to trade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSymbol();
                  }
                }}
                placeholder="AAPL"
                maxLength={5}
                className="bg-slate-900 border-slate-700 text-white w-32"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addSymbol}
                className="border-slate-600"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {symbols.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {symbols.map((symbol) => (
                  <span
                    key={symbol}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-slate-700 rounded-full text-sm text-white"
                  >
                    {symbol}
                    <button
                      type="button"
                      onClick={() => removeSymbol(symbol)}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Strategy Parameters */}
        {selectedType && selectedType.parameters.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Strategy Parameters</CardTitle>
              <CardDescription className="text-slate-400">
                Configure the parameters for {selectedType.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedType.parameters.map((param) => (
                <div key={param.name} className="space-y-2">
                  <Label htmlFor={param.name} className="text-slate-300">
                    {param.label}
                  </Label>
                  <Input
                    id={param.name}
                    type="number"
                    value={parameters[param.name] ?? param.default}
                    onChange={(e) =>
                      setParameters({
                        ...parameters,
                        [param.name]: Number(e.target.value),
                      })
                    }
                    min={param.min}
                    max={param.max}
                    step={param.type === "float" ? 0.1 : 1}
                    className="bg-slate-900 border-slate-700 text-white w-32"
                  />
                  {param.min !== undefined && param.max !== undefined && (
                    <p className="text-xs text-slate-500">
                      Range: {param.min} - {param.max}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Risk Management */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Risk Management</CardTitle>
            <CardDescription className="text-slate-400">
              Set limits to protect your portfolio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxPosition" className="text-slate-300">
                  Max Position Size (%)
                </Label>
                <Input
                  id="maxPosition"
                  type="number"
                  value={maxPositionSize}
                  onChange={(e) => setMaxPositionSize(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-500">
                  Maximum % of portfolio per position
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxDailyLoss" className="text-slate-300">
                  Max Daily Loss (%)
                </Label>
                <Input
                  id="maxDailyLoss"
                  type="number"
                  value={maxDailyLoss}
                  onChange={(e) => setMaxDailyLoss(Number(e.target.value))}
                  min={1}
                  max={50}
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-500">
                  Stop trading if daily loss exceeds this
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stopLoss" className="text-slate-300">
                  Stop Loss (%) <span className="text-slate-500">- optional</span>
                </Label>
                <Input
                  id="stopLoss"
                  type="number"
                  value={stopLossPct}
                  onChange={(e) =>
                    setStopLossPct(e.target.value ? Number(e.target.value) : "")
                  }
                  min={1}
                  max={50}
                  placeholder="e.g., 5"
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-500">
                  Exit position if loss exceeds this %
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="takeProfit" className="text-slate-300">
                  Take Profit (%) <span className="text-slate-500">- optional</span>
                </Label>
                <Input
                  id="takeProfit"
                  type="number"
                  value={takeProfitPct}
                  onChange={(e) =>
                    setTakeProfitPct(e.target.value ? Number(e.target.value) : "")
                  }
                  min={1}
                  max={100}
                  placeholder="e.g., 10"
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-500">
                  Exit position if profit reaches this %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/dashboard/strategies">
            <Button type="button" variant="outline" className="border-slate-600">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? "Creating..." : "Create Strategy"}
          </Button>
        </div>
      </form>
    </div>
  );
}
