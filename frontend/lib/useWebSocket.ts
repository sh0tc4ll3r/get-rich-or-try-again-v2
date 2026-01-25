/**
 * WebSocket hook for real-time data streaming.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export interface Quote {
  symbol: string;
  bid_price: string;
  ask_price: string;
  bid_size: number;
  ask_size: number;
  timestamp: string;
}

export interface Position {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
  side: string;
}

export interface ExecutionSignal {
  symbol: string;
  action: string;
  qty?: number;
  price?: number;
  order_id?: string;
  status?: string;
  reason?: string;
  error?: string;
}

export interface WebSocketMessage {
  type: "quote" | "positions" | "execution" | "subscribed" | "unsubscribed" | "heartbeat" | "error";
  symbol?: string;
  data?: Quote | Position[] | Record<string, unknown>;
  signals?: ExecutionSignal[];
  strategy_id?: number;
  symbols?: string[];
  message?: string;
  timestamp?: string;
}

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  onQuote?: (symbol: string, quote: Quote) => void;
  onPositions?: (positions: Position[]) => void;
  onExecution?: (strategyId: number, signals: ExecutionSignal[]) => void;
  onError?: (message: string) => void;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  quotes: Map<string, Quote>;
  positions: Position[];
  lastExecution: { strategyId: number; signals: ExecutionSignal[] } | null;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { getToken } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [quotes, setQuotes] = useState<Map<string, Quote>>(new Map());
  const [positions, setPositions] = useState<Position[]>([]);
  const [lastExecution, setLastExecution] = useState<{
    strategyId: number;
    signals: ExecutionSignal[];
  } | null>(null);

  const {
    autoConnect = true,
    onQuote,
    onPositions,
    onExecution,
    onError,
  } = options;

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        console.warn("No auth token available for WebSocket");
        return;
      }

      const ws = new WebSocket(`${WS_BASE_URL}/api/ws?token=${token}`);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect after 5 seconds
        if (!event.wasClean && autoConnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("Attempting to reconnect...");
            connect();
          }, 5000);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        onError?.("WebSocket connection error");
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
    }
  }, [getToken, autoConnect, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case "quote":
        if (message.symbol && message.data) {
          const quote = message.data as Quote;
          setQuotes((prev) => {
            const next = new Map(prev);
            next.set(message.symbol!, quote);
            return next;
          });
          onQuote?.(message.symbol, quote);
        }
        break;

      case "positions":
        if (message.data) {
          const positionsData = message.data as Position[];
          setPositions(positionsData);
          onPositions?.(positionsData);
        }
        break;

      case "execution":
        if (message.strategy_id !== undefined && message.signals) {
          setLastExecution({
            strategyId: message.strategy_id,
            signals: message.signals,
          });
          onExecution?.(message.strategy_id, message.signals);
        }
        break;

      case "subscribed":
        console.log("Subscribed to symbols:", message.symbols);
        break;

      case "unsubscribed":
        console.log("Unsubscribed from symbols:", message.symbols);
        break;

      case "heartbeat":
        // Heartbeat received, connection is alive
        break;

      case "error":
        console.error("WebSocket error:", message.message);
        onError?.(message.message || "Unknown error");
        break;
    }
  }, [onQuote, onPositions, onExecution, onError]);

  const subscribe = useCallback((symbols: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: "subscribe",
        symbols,
      }));
    }
  }, []);

  const unsubscribe = useCallback((symbols: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: "unsubscribe",
        symbols,
      }));
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    quotes,
    positions,
    lastExecution,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
  };
}
