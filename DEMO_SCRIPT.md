# Demo Script — Get Rich or Try Again

**Format:** Loom walkthrough (~2-3 min)
**Audience:** Fintech hiring managers
**Goal:** Show "PM who can build" — product thinking + execution

---

## 1. Hook (10s)

> "4 years ago I built a trading bot for my engineering thesis. I just rebuilt it from scratch as a full product — here's what changed."

---

## 2. Problem (15s)

> "Retail traders have ideas — they read about RSI, momentum, mean reversion — but there's no safe way to validate a strategy before risking real money. You either paper trade manually, which is tedious, or you go live and lose capital testing a hypothesis.
>
> This app is the middle ground."

---

## 3. Name Drop (5s)

> "It's called **Get Rich or Try Again** — riff on 'Get Rich or Die Trying.' Since everything runs on paper trading, there's no real money on the line. You can literally try again."

---

## 4. Page-by-Page Walkthrough (90s)

### Landing Page

> "The landing page leads with the concept: paper trading, real strategies, no risk. Three core value props: backtest before you trade, deploy with guardrails, monitor in real-time. This is the 'how it works' flow — build a strategy, run a backtest, deploy, monitor. Simple product loop."

**Click:** "Get Started"

---

### Strategies Page (`/dashboard/strategies`)

> "Here are three strategies. RSI Oversold Bounce on AAPL and NVDA — this one is live and auto-executing. MSFT Mean Reversion is still in draft.
>
> And then there's TSLA Momentum — it's paused. I'll come back to why in a second.
>
> The idea behind multiple strategies is diversification across market regimes. RSI works in ranging markets, momentum works in trending ones. The risk limits — max position size, stop-loss — are the guardrail so no single strategy can blow up the portfolio."

---

### Backtests Page (`/dashboard/backtests`)

> "Before anything goes live, it has to pass a backtest. This is the gate, not an afterthought.
>
> RSI Oversold Bounce: plus 18% return, Sharpe of 1.83. Solid.
>
> MSFT Mean Reversion: plus 11%, Sharpe 1.24. Solid.
>
> And here's the honest one — TSLA Momentum: plus 4%, Sharpe 0.42. That's mediocre. And that's exactly why it's paused. I didn't cherry-pick the results. A Sharpe under 0.5 doesn't justify deployment. The system is working as designed — backtesting is discipline, not decoration."

---

### Analytics Page (`/dashboard/analytics`)

> "The analytics view aggregates across all strategies. Sharpe of 1.47, max drawdown minus 8.3%, win rate around 59%. The cumulative returns chart shows the equity curve over time.
>
> These are the numbers a quant or risk manager would look at first. Making them visible here is a deliberate product decision — it keeps the user accountable to the math, not just the P&L number."

---

### Live Dashboard (`/dashboard`)

> "The live dashboard. Portfolio at roughly $103k. Today's P&L up $1,456.
>
> Four open positions. AAPL, NVDA, MSFT — all green. TSLA — red, and paused. That's consistent with what we saw in the backtest: the strategy didn't earn its place yet.
>
> The equity curve here is the 30-day view. WebSocket streaming keeps positions and prices updating in real-time.
>
> This is what the product looks like when it's working."

---

## 5. PM Lens (30s)

> "As a PM, here's how I'd think about this:
>
> The metric I'd track first is **backtest-to-deploy conversion** — what percentage of strategies that get backtested actually get deployed? If it's too low, maybe the backtest criteria are too strict. If it's near 100%, users aren't being selective enough.
>
> Second, **strategy win rate over time** — are deployed strategies actually outperforming in live paper trading vs. their backtest? That's the signal that the backtesting model is well-calibrated.
>
> What I'd build next: **custom strategy code**. Right now users pick from preset types — RSI, momentum, mean reversion, MACD. Power users want to bring their own logic. That's the unlock for the serious quant crowd, and it's where retention gets interesting."

---

## 6. Close (10s)

> "Built with Next.js on the frontend, FastAPI on the backend, Alpaca for paper trading. Full code is on GitHub — link in the description."

---

## Notes for Recording

- Use `NEXT_PUBLIC_DEMO_MODE=true` — already set in `frontend/.env.local`
- Suppress onboarding modal before hitting record (it auto-suppresses in demo mode)
- Equity curve is deterministic — same shape on every refresh, safe to record
- TSLA position is red — intentional, ties to the Sharpe 0.42 backtest story
- Cash ($57,855) + Positions ($45,992) = Portfolio ($103,847) — math checks out if a viewer pauses
- Tab order for recording: Landing → Strategies → Backtests → Analytics → Dashboard
