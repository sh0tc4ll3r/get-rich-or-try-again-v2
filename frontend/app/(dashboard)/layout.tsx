"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Menu, X, Bell } from "lucide-react";
import { ToastProvider } from "@/components/ui/toast";
import { NotificationBell } from "@/components/notification-bell";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/strategies", label: "Strategies" },
  { href: "/dashboard/backtests", label: "Backtests" },
  { href: "/dashboard/trades", label: "Trades" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/compare", label: "Compare" },
  { href: "/dashboard/journal", label: "Journal" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-900">
        <nav className="border-b border-slate-800 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 sticky top-0 z-40">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="text-xl font-bold text-white">
                Get Rich v2
              </Link>
              <div className="hidden md:flex items-center gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-slate-300 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <UserButton afterSignOutUrl="/" />
              {/* Mobile menu button */}
              <button
                type="button"
                className="md:hidden text-slate-400 hover:text-white"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <>
              {/* Backdrop for closing on outside click */}
              <div
                className="md:hidden fixed inset-0 top-16 bg-black/50 z-30"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="md:hidden border-t border-slate-800 bg-slate-900 relative z-40">
                <div className="container mx-auto px-4 py-4 space-y-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </nav>
        <main className="container mx-auto px-4 py-8">{children}</main>
      </div>
    </ToastProvider>
  );
}
