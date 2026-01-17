import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900">
      <nav className="border-b border-slate-800 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold text-white">
              Get Rich v2
            </Link>
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm text-slate-300 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/strategies"
                className="text-sm text-slate-300 hover:text-white transition-colors"
              >
                Strategies
              </Link>
              <Link
                href="/dashboard/backtests"
                className="text-sm text-slate-300 hover:text-white transition-colors"
              >
                Backtests
              </Link>
              <Link
                href="/dashboard/trades"
                className="text-sm text-slate-300 hover:text-white transition-colors"
              >
                Trades
              </Link>
            </div>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
