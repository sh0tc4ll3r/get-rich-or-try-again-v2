import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center space-y-8 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
            Get Rich v2
          </h1>
          <p className="max-w-2xl text-lg text-slate-300">
            Build, backtest, and deploy algorithmic trading strategies with ease.
            Paper trading powered by Alpaca.
          </p>

          <div className="flex gap-4">
            <Button asChild size="lg">
              <Link href="/sign-up">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Strategy Builder</CardTitle>
                <CardDescription className="text-slate-400">
                  Create custom trading strategies with our visual editor
                </CardDescription>
              </CardHeader>
              <CardContent className="text-slate-300">
                Define entry/exit rules, risk management, and position sizing.
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Backtesting</CardTitle>
                <CardDescription className="text-slate-400">
                  Test strategies against historical data
                </CardDescription>
              </CardHeader>
              <CardContent className="text-slate-300">
                See how your strategy would have performed with detailed metrics.
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Paper Trading</CardTitle>
                <CardDescription className="text-slate-400">
                  Deploy to Alpaca paper trading
                </CardDescription>
              </CardHeader>
              <CardContent className="text-slate-300">
                Trade with simulated money before going live.
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
