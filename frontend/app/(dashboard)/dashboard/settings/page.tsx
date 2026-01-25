"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  Settings,
  User,
  Link as LinkIcon,
  Shield,
  Bell,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi, type UserProfile } from "@/lib/api";

export default function SettingsPage() {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Alpaca connection form
  const [alpacaKey, setAlpacaKey] = useState("");
  const [alpacaSecret, setAlpacaSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Risk settings
  const [riskSettings, setRiskSettings] = useState({
    defaultMaxPositionSize: 10,
    defaultMaxDailyLoss: 5,
    defaultStopLoss: 5,
    defaultTakeProfit: 10,
  });
  const [savingRisk, setSavingRisk] = useState(false);

  const fetchProfile = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await authApi.getProfile(token);
      setProfile(data);
      // Initialize risk settings from profile
      setRiskSettings({
        defaultMaxPositionSize: Math.round(data.default_max_position_size * 100),
        defaultMaxDailyLoss: Math.round(data.default_max_daily_loss * 100),
        defaultStopLoss: data.default_stop_loss_pct ? Math.round(data.default_stop_loss_pct * 100) : 5,
        defaultTakeProfit: data.default_take_profit_pct ? Math.round(data.default_take_profit_pct * 100) : 10,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleConnectAlpaca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alpacaKey || !alpacaSecret) return;

    try {
      setConnecting(true);
      setError(null);
      const token = await getToken();
      if (!token) return;

      await authApi.connectAlpaca(token, alpacaKey, alpacaSecret);
      setSuccess("Alpaca account connected successfully!");
      setAlpacaKey("");
      setAlpacaSecret("");
      fetchProfile();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect Alpaca");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectAlpaca = async () => {
    if (!confirm("Are you sure you want to disconnect your Alpaca account?")) return;

    try {
      setDisconnecting(true);
      setError(null);
      const token = await getToken();
      if (!token) return;

      await authApi.disconnectAlpaca(token);
      setSuccess("Alpaca account disconnected");
      fetchProfile();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect Alpaca");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveRiskSettings = async () => {
    try {
      setSavingRisk(true);
      setError(null);
      const token = await getToken();
      if (!token) return;

      // Convert percentages to decimals for API
      const updatedProfile = await authApi.updateSettings(token, {
        default_max_position_size: riskSettings.defaultMaxPositionSize / 100,
        default_max_daily_loss: riskSettings.defaultMaxDailyLoss / 100,
        default_stop_loss_pct: riskSettings.defaultStopLoss / 100,
        default_take_profit_pct: riskSettings.defaultTakeProfit / 100,
      });

      setProfile(updatedProfile);
      setSuccess("Risk settings saved!");
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSavingRisk(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-slate-400">Manage your account and preferences</p>
      </div>

      {/* Status Messages */}
      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-4 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-400" />
            <p className="text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="py-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <p className="text-green-400">{success}</p>
          </CardContent>
        </Card>
      )}

      {/* Profile Section */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription className="text-slate-400">
            Your account information from Clerk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {clerkUser?.imageUrl && (
              <img
                src={clerkUser.imageUrl}
                alt="Profile"
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <p className="text-white font-medium">
                {profile?.name || clerkUser?.fullName || "No name set"}
              </p>
              <p className="text-slate-400 text-sm">{profile?.email}</p>
              <p className="text-slate-500 text-xs mt-1">
                Member since {profile ? new Date().toLocaleDateString() : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alpaca Connection */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Alpaca Connection
            {profile?.alpaca_connected ? (
              <Badge variant="success" className="ml-2">Connected</Badge>
            ) : (
              <Badge variant="secondary" className="ml-2">Not Connected</Badge>
            )}
          </CardTitle>
          <CardDescription className="text-slate-400">
            Connect your Alpaca paper trading account to execute strategies
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile?.alpaca_connected ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Alpaca account is connected</span>
                </div>
                <p className="text-slate-400 text-sm mt-2">
                  Your paper trading account is linked and ready for automated trading.
                </p>
              </div>
              <Button
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                onClick={handleDisconnectAlpaca}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Disconnect Alpaca
              </Button>
            </div>
          ) : (
            <form onSubmit={handleConnectAlpaca} className="space-y-4">
              <div className="p-4 bg-slate-900/50 rounded-lg space-y-4">
                <p className="text-slate-400 text-sm">
                  Get your API keys from{" "}
                  <a
                    href="https://app.alpaca.markets/paper/dashboard/overview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Alpaca Paper Trading Dashboard
                  </a>
                </p>

                <div className="space-y-2">
                  <Label htmlFor="alpaca-key" className="text-slate-300">
                    API Key
                  </Label>
                  <Input
                    id="alpaca-key"
                    type="text"
                    value={alpacaKey}
                    onChange={(e) => setAlpacaKey(e.target.value)}
                    placeholder="PKXXXXXXXXXXXXXXXX"
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alpaca-secret" className="text-slate-300">
                    Secret Key
                  </Label>
                  <div className="relative">
                    <Input
                      id="alpaca-secret"
                      type={showSecret ? "text" : "password"}
                      value={alpacaSecret}
                      onChange={(e) => setAlpacaSecret(e.target.value)}
                      placeholder="Enter your secret key"
                      className="bg-slate-900 border-slate-700 text-white pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showSecret ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={connecting || !alpacaKey || !alpacaSecret}
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <LinkIcon className="h-4 w-4 mr-2" />
                )}
                Connect Alpaca
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Risk Settings */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Default Risk Settings
          </CardTitle>
          <CardDescription className="text-slate-400">
            Default values for new strategies (can be overridden per strategy)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="max-position" className="text-slate-300">
                Max Position Size (% of portfolio)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="max-position"
                  type="number"
                  min="1"
                  max="100"
                  value={riskSettings.defaultMaxPositionSize}
                  onChange={(e) =>
                    setRiskSettings({
                      ...riskSettings,
                      defaultMaxPositionSize: parseInt(e.target.value) || 0,
                    })
                  }
                  className="bg-slate-900 border-slate-700 text-white w-24"
                />
                <span className="text-slate-400">%</span>
              </div>
              <p className="text-xs text-slate-500">
                Maximum allocation per position
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-daily-loss" className="text-slate-300">
                Max Daily Loss (% of portfolio)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="max-daily-loss"
                  type="number"
                  min="1"
                  max="50"
                  value={riskSettings.defaultMaxDailyLoss}
                  onChange={(e) =>
                    setRiskSettings({
                      ...riskSettings,
                      defaultMaxDailyLoss: parseInt(e.target.value) || 0,
                    })
                  }
                  className="bg-slate-900 border-slate-700 text-white w-24"
                />
                <span className="text-slate-400">%</span>
              </div>
              <p className="text-xs text-slate-500">
                Stop trading when daily loss exceeds this
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stop-loss" className="text-slate-300">
                Default Stop Loss (%)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="stop-loss"
                  type="number"
                  min="0.5"
                  max="50"
                  step="0.5"
                  value={riskSettings.defaultStopLoss}
                  onChange={(e) =>
                    setRiskSettings({
                      ...riskSettings,
                      defaultStopLoss: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="bg-slate-900 border-slate-700 text-white w-24"
                />
                <span className="text-slate-400">%</span>
              </div>
              <p className="text-xs text-slate-500">
                Exit position when loss exceeds this
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="take-profit" className="text-slate-300">
                Default Take Profit (%)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="take-profit"
                  type="number"
                  min="0.5"
                  max="100"
                  step="0.5"
                  value={riskSettings.defaultTakeProfit}
                  onChange={(e) =>
                    setRiskSettings({
                      ...riskSettings,
                      defaultTakeProfit: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="bg-slate-900 border-slate-700 text-white w-24"
                />
                <span className="text-slate-400">%</span>
              </div>
              <p className="text-xs text-slate-500">
                Exit position when profit exceeds this
              </p>
            </div>
          </div>

          <Button
            onClick={handleSaveRiskSettings}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={savingRisk}
          >
            {savingRisk ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Save Risk Settings
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription className="text-slate-400">
            Configure how you want to be notified
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
              <div>
                <p className="text-white font-medium">Trade Executions</p>
                <p className="text-slate-400 text-sm">
                  Get notified when strategies execute trades
                </p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
              <div>
                <p className="text-white font-medium">Daily Summary</p>
                <p className="text-slate-400 text-sm">
                  Receive a daily summary of your portfolio
                </p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
              <div>
                <p className="text-white font-medium">Risk Alerts</p>
                <p className="text-slate-400 text-sm">
                  Get alerts when hitting risk limits
                </p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
