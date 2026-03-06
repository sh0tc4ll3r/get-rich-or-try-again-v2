import Link from "next/link";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col">
      <div className="container mx-auto px-4 py-16 flex-1">
        <div className="flex flex-col items-center justify-center space-y-8 text-center animate-in fade-in duration-700">
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
            <Card className="bg-slate-800/50 border-slate-700 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
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

            <Card className="bg-slate-800/50 border-slate-700 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
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

            <Card className="bg-slate-800/50 border-slate-700 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
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

      <footer className="border-t border-slate-800 py-6">
        <div className="container mx-auto px-4 flex items-center justify-center gap-4 text-slate-400 text-sm">
          <span>Built by David Lorenzo</span>
          <span className="text-slate-600">|</span>
          <a
            href="https://github.com/davidlorenzo"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
