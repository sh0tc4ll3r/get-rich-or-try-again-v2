"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, X, TrendingUp, TrendingDown, AlertTriangle, Zap } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useWebSocket, type ExecutionSignal } from "@/lib/useWebSocket";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "trade" | "signal" | "risk";
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
}

const NOTIFICATIONS_KEY = "get-rich-notifications";
const MAX_NOTIFICATIONS = 20;

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { addToast } = useToast();

  // Load notifications from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert timestamps back to Date objects and filter to last 24h
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recent = parsed
          .map((n: Notification & { timestamp: string }) => ({
            ...n,
            timestamp: new Date(n.timestamp),
          }))
          .filter((n: Notification) => n.timestamp > cutoff);
        setNotifications(recent);
      } catch (e) {
        console.error("Failed to parse notifications:", e);
      }
    }
  }, []);

  // Save notifications to localStorage when they change
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    }
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).slice(2, 11),
      timestamp: new Date(),
      read: false,
    };

    setNotifications((prev) => {
      const updated = [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS);
      return updated;
    });

    // Also show a toast
    addToast({
      type: notification.type === "risk" ? "warning" : notification.type === "trade" ? "success" : "info",
      title: notification.title,
      description: notification.description,
    });
  }, [addToast]);

  // Handle WebSocket execution events
  const handleExecution = useCallback((strategyId: number, signals: ExecutionSignal[]) => {
    signals.forEach((signal) => {
      if (signal.action === "buy" || signal.action === "sell") {
        addNotification({
          type: "trade",
          title: `${signal.action.toUpperCase()} Order Placed`,
          description: `${signal.qty} ${signal.symbol} @ $${signal.price?.toFixed(2) || "market"}`,
        });
      } else if (signal.action === "skip") {
        addNotification({
          type: "signal",
          title: "Signal Skipped",
          description: `${signal.symbol}: ${signal.reason}`,
        });
      }
    });

    if (signals.length === 0) {
      addNotification({
        type: "signal",
        title: "No Signals Generated",
        description: `Strategy ${strategyId} analyzed, no action needed`,
      });
    }
  }, [addNotification]);

  // Connect to WebSocket for real-time updates
  useWebSocket({
    autoConnect: true,
    onExecution: handleExecution,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.removeItem(NOTIFICATIONS_KEY);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "trade":
        return <TrendingUp className="h-4 w-4 text-green-400" />;
      case "risk":
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      default:
        return <Zap className="h-4 w-4 text-blue-400" />;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <h3 className="font-semibold text-white">Notifications</h3>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllRead}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Mark all read
                    </button>
                    <button
                      onClick={clearAll}
                      className="text-xs text-slate-400 hover:text-red-400"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No notifications yet</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Trade executions and signals will appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex gap-3 p-4 hover:bg-slate-700/50 transition-colors",
                        !notification.read && "bg-slate-700/30"
                      )}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {notification.description}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatTime(notification.timestamp)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
