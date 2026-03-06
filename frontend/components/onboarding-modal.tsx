"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  X,
  Link as LinkIcon,
  TrendingUp,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { authApi, strategiesApi, backtestsApi, type UserProfile } from "@/lib/api";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  href?: string;
  action?: string;
}

export function OnboardingModal({ isOpen, onClose, profile }: OnboardingModalProps) {
  const { getToken } = useAuth();
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: "alpaca",
      title: "Connect Alpaca Account",
      description: "Link your paper trading account to enable live trading",
      icon: <LinkIcon className="h-6 w-6" />,
      completed: false,
      href: "/dashboard/settings",
      action: "Connect",
    },
    {
      id: "strategy",
      title: "Create Your First Strategy",
      description: "Choose a trading strategy and configure your parameters",
      icon: <TrendingUp className="h-6 w-6" />,
      completed: false,
      href: "/dashboard/strategies/new",
      action: "Create",
    },
    {
      id: "backtest",
      title: "Run Your First Backtest",
      description: "Test your strategy against historical data",
      icon: <BarChart3 className="h-6 w-6" />,
      completed: false,
      href: "/dashboard/backtests",
      action: "Backtest",
    },
  ]);

  useEffect(() => {
    const checkProgress = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const [strategies, backtests] = await Promise.all([
          strategiesApi.list(token).catch(() => []),
          backtestsApi.list(token).catch(() => []),
        ]);

        setSteps((prev) =>
          prev.map((step) => {
            if (step.id === "alpaca") {
              return { ...step, completed: profile?.alpaca_connected ?? false };
            }
            if (step.id === "strategy") {
              return { ...step, completed: strategies.length > 0 };
            }
            if (step.id === "backtest") {
              return { ...step, completed: backtests.length > 0 };
            }
            return step;
          })
        );
      } catch (err) {
        console.error("Failed to check onboarding progress:", err);
      }
    };

    if (isOpen) {
      checkProgress();
    }
  }, [isOpen, profile, getToken]);

  const completedCount = steps.filter((s) => s.completed).length;
  const allCompleted = completedCount === steps.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Rocket className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Welcome to Get Rich v2</h2>
                <p className="text-slate-400 text-sm">
                  Let&apos;s get you set up for algorithmic trading
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">Setup Progress</span>
              <span className="text-white font-medium">
                {completedCount} of {steps.length} complete
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                style={{ width: `${(completedCount / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="p-6 space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${
                step.completed
                  ? "bg-green-500/10 border border-green-500/30"
                  : "bg-slate-900/50 border border-slate-700"
              }`}
            >
              {/* Step number or check */}
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  step.completed
                    ? "bg-green-500/20 text-green-400"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {step.completed ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span className="font-semibold">{index + 1}</span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3
                  className={`font-medium ${
                    step.completed ? "text-green-400" : "text-white"
                  }`}
                >
                  {step.title}
                </h3>
                <p className="text-slate-400 text-sm mt-0.5">{step.description}</p>
              </div>

              {/* Action */}
              {!step.completed && step.href && (
                <Link href={step.href} onClick={onClose}>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                  >
                    {step.action}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              )}
              {step.completed && (
                <span className="text-green-400 text-sm font-medium flex-shrink-0">
                  Done
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-800/50 rounded-b-xl">
          {allCompleted ? (
            <div className="text-center">
              <p className="text-green-400 font-medium mb-3">
                You&apos;re all set up and ready to trade!
              </p>
              <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
                Start Trading
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm">
                Complete these steps to start algorithmic trading
              </p>
              <Button variant="ghost" onClick={onClose} className="text-slate-400">
                Skip for now
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ONBOARDING_DISMISSED_KEY = "get-rich-onboarding-dismissed";

export function useOnboarding(profile: UserProfile | null, strategiesCount: number, backtestsCount: number) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if onboarding was already dismissed
    const dismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
    if (dismissed === "true") {
      return;
    }

    // Show onboarding if user is new (no Alpaca, no strategies, no backtests)
    const isNewUser = !profile?.alpaca_connected && strategiesCount === 0;
    if (isNewUser) {
      setShowOnboarding(true);
    }
  }, [profile, strategiesCount, backtestsCount]);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    dismissOnboarding,
    resetOnboarding,
  };
}
