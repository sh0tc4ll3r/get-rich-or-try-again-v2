import Link from "next/link";
import { Github, ArrowRight, BarChart3, Shield, Zap, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    number: "01",
    title: "Build Strategy",
    description: "Choose from RSI, Momentum, Mean Reversion, or Breakout — configure risk limits and symbols.",
  },
  {
    number: "02",
    title: "Backtest",
    description: "Run against historical data. See Sharpe ratio, drawdown, win rate — no guessing.",
  },
  {
    number: "03",
    title: "Deploy",
    description: "Push to Alpaca paper trading with built-in guardrails. Auto-execute or review signals manually.",
  },
  {
    number: "04",
    title: "Monitor",
    description: "Real-time dashboard with WebSocket streaming. Track positions, P&L, and execution logs live.",
  },
];

const features = [
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Backtest Before You Trade",
    description:
      "Validate strategies against historical data before risking capital. See total return, Sharpe ratio, max drawdown, and win rate.",
    color: "blue",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Deploy with Guardrails",
    description:
      "Every strategy ships with stop-loss, take-profit, position sizing, and daily loss limits. Risk management is built in, not bolted on.",
    color: "emerald",
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Monitor in Real-Time",
    description:
      "Live dashboard powered by WebSocket streaming. See positions update, signals fire, and orders fill — as they happen.",
    color: "amber",
  },
];

const techStack = [
  "Next.js 14",
  "FastAPI",
  "PostgreSQL",
  "Redis",
  "Alpaca API",
  "WebSocket",
  "TypeScript",
  "Python",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 pt-20 pb-24 relative">
          <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-700 bg-slate-800/50 text-slate-300 text-sm mb-8">
              <LineChart className="h-3.5 w-3.5 text-blue-400" />
              Algorithmic Paper Trading Platform
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
              Get Rich<br />
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                or Try Again
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-xl leading-relaxed">
              Paper trading. Real strategies. No risk — just try again.
            </p>

            <p className="mt-4 text-sm text-slate-500 max-w-lg">
              Retail traders have ideas but no way to validate them before risking real money.
              Build strategies, backtest against real data, and deploy to paper trading — all in one place.
            </p>

            <div className="flex gap-4 mt-10">
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-base px-8">
                <Link href="/sign-up">
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-slate-600 text-base px-8">
                <Link href="/sign-in">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="border-t border-slate-800 bg-slate-900/50">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white">
              From idea to live paper trading
            </h2>
            <p className="text-slate-400 mt-3 max-w-lg mx-auto">
              Everything you need to build, validate, and run algorithmic strategies — without writing infrastructure code.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="bg-slate-800/30 border-slate-700/50 hover:border-slate-600 transition-colors"
              >
                <CardContent className="p-6">
                  <div
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-4 ${
                      feature.color === "blue"
                        ? "bg-blue-500/15 text-blue-400"
                        : feature.color === "emerald"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-slate-800">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white">How it works</h2>
            <p className="text-slate-400 mt-3">Four steps from strategy idea to live paper trading.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {steps.map((step) => (
              <div key={step.number} className="relative">
                <div className="text-4xl font-bold text-slate-800 mb-3">{step.number}</div>
                <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="border-t border-slate-800">
        <div className="container mx-auto px-4 py-14">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {techStack.map((tech) => (
              <span
                key={tech}
                className="px-3 py-1.5 rounded-md bg-slate-800/50 border border-slate-700/50 text-slate-400 text-xs font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-auto">
        <div className="container mx-auto px-4 py-6 flex items-center justify-center gap-4 text-slate-500 text-sm">
          <span>Built by David Lorenzo</span>
          <span className="text-slate-700">|</span>
          <a
            href="https://github.com/davidlorenzo"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-slate-300 transition-colors"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
