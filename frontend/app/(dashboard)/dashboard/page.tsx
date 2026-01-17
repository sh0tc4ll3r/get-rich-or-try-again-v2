import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-2">
          Welcome to Get Rich v2. Start building your trading strategies.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Portfolio Value</CardDescription>
            <CardTitle className="text-2xl text-white">$100,000.00</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-400">Paper Trading Account</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Today&apos;s P&L</CardDescription>
            <CardTitle className="text-2xl text-white">$0.00</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">0.00%</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Active Strategies</CardDescription>
            <CardTitle className="text-2xl text-white">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">No strategies running</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Open Positions</CardDescription>
            <CardTitle className="text-2xl text-white">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">No open positions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-slate-400">
              Get started with these common tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/dashboard/strategies/new">Create New Strategy</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/backtests">View Backtests</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
            <CardDescription className="text-slate-400">
              Your latest trading activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 text-sm">No recent activity</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
