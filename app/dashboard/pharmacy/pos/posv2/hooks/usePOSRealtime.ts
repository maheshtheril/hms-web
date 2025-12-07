// usePOSRealtime.ts
// Real-time stock + reservation sync for POS V2
// - Uses WebSocket (fallback to polling)
// - Auto-reconnect with jitter/backoff
// - Subscriptions per-product, global events
// - Emits events for reservation-created/released/updated and stock changes
// - Lightweight TypeScript types and safe public API for UI hooks

import { useCallback, useEffect, useRef, useState } from "react";

type SocketMessage =
  | { type: "stock:update"; product_id: string; batch_id?: string | null; available_qty: number }
  | { type: "reservation:created"; product_id: string; reservation_id: string; batch_id?: string | null; expires_at?: string | null; quantity: number }
  | { type: "reservation:updated"; product_id: string; reservation_id: string; expires_at?: string | null; quantity: number }
  | { type: "reservation:released"; product_id: string; reservation_id: string }
  | { type: "batch:expired"; product_id: string; batch_id: string }
  | { type: "ping" }
  | { type: string; [k: string]: any };

export type RealtimeEventHandler = (msg: SocketMessage) => void;

export interface UsePOSRealtimeAPI {
  connected: boolean;
  lastError: string | null;
  connect: () => void;
  disconnect: () => void;
  subscribeProduct: (productId: string, fn: RealtimeEventHandler) => () => void;
  subscribeAll: (fn: RealtimeEventHandler) => () => void;
  sendHeartbeat: () => void;
  getSocketState: () => "closed" | "connecting" | "open" | "fallback-polling";
}

/**
 * Configuration you can tune
 * - WS_URL: Websocket endpoint (prefer secure wss://)
 * - FALLBACK_POLL_INTERVAL: ms to poll when WS unavailable
 */
const WS_URL = (process.env.NEXT_PUBLIC_POS_WS_URL || "").replace(/^http/, "ws") || undefined;
const FALLBACK_POLL_INTERVAL = 10_000;

function nowMs() {
  return Date.now();
}

export function usePOSRealtime(opts?: { wsUrl?: string; pollIntervalMs?: number }): UsePOSRealtimeAPI {
  const wsUrl = opts?.wsUrl || WS_URL;
  const pollIntervalMs = opts?.pollIntervalMs ?? FALLBACK_POLL_INTERVAL;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const backoff = useRef(500); // start 500ms
  const lastPong = useRef<number>(0);
  const pollTimer = useRef<number | null>(null);

  const handlersByProduct = useRef<Map<string, Set<RealtimeEventHandler>>>(new Map());
  const globalHandlers = useRef<Set<RealtimeEventHandler>>(new Set());
  const [connected, setConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const socketState = useRef<"closed" | "connecting" | "open" | "fallback-polling">("closed");

  // internal safe JSON parse
  const safeParse = useCallback((data: any): SocketMessage | null => {
    try {
      if (typeof data === "string") return JSON.parse(data) as SocketMessage;
      return data as SocketMessage;
    } catch (e) {
      console.warn("realtime: failed to parse message", e);
      return null;
    }
  }, []);

  const dispatchMessage = useCallback((msg: SocketMessage) => {
    // call product-specific handlers
    const pid = (msg as any).product_id;
    if (pid) {
      const set = handlersByProduct.current.get(pid);
      if (set) {
        for (const h of Array.from(set)) {
          try { h(msg); } catch (e) { console.warn("handler error", e); }
        }
      }
    }

    // call global handlers
    for (const h of Array.from(globalHandlers.current)) {
      try { h(msg); } catch (e) { console.warn("global handler error", e); }
    }
  }, []);

  // WebSocket open config
  const setupWebsocket = useCallback(() => {
    if (!wsUrl) {
      setLastError("no websocket URL configured");
      return;
    }

    // avoid multiple parallel connects
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    socketState.current = "connecting";
    setConnected(false);
    setLastError(null);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        console.info("[realtime] ws open");
        socketState.current = "open";
        setConnected(true);
        backoff.current = 500;
        lastPong.current = nowMs();

        // send initial subscription hint: product list keys if available
        try {
          const products = Array.from(handlersByProduct.current.keys());
          ws.send(JSON.stringify({ type: "subscribe:init", products }));
        } catch (e) {}
      });

      ws.addEventListener("message", (ev) => {
        const payload = safeParse(ev.data);
        if (!payload) return;
        if ((payload as any).type === "pong") {
          lastPong.current = nowMs();
          return;
        }
        dispatchMessage(payload);
      });

      ws.addEventListener("close", (ev) => {
        console.warn("[realtime] ws closed", ev.code, ev.reason);
        socketState.current = "closed";
        setConnected(false);
        scheduleReconnect();
      });

      ws.addEventListener("error", (ev) => {
        console.error("[realtime] ws error", ev);
        setLastError("websocket error");
        // close will trigger reconnect
      });
    } catch (err: any) {
      console.error("[realtime] failed to create websocket", err);
      setLastError(String(err?.message || err));
      scheduleReconnect();
    }
  }, [wsUrl, safeParse, dispatchMessage]);

  const scheduleReconnect = useCallback(() => {
    // stop any existing reconnect timer
    if (reconnectTimer.current) {
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    // exponential backoff with jitter
    const base = backoff.current;
    const jitter = Math.floor(Math.random() * base);
    const delay = Math.min(60_000, base + jitter);

    // increase backoff
    backoff.current = Math.min(60_000, Math.floor(backoff.current * 1.7));

    reconnectTimer.current = window.setTimeout(() => {
      reconnectTimer.current = null;
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        try { wsRef.current.close(); } catch (e) {}
      }
      setupWebsocket();
    }, delay);
  }, [setupWebsocket]);

  // fallback polling when no wsUrl or ws fails
  const startFallbackPolling = useCallback(() => {
    if (pollTimer.current) return;
    socketState.current = "fallback-polling";
    setConnected(false);
    pollTimer.current = window.setInterval(async () => {
      // poll for subscribed products
      const products = Array.from(handlersByProduct.current.keys());
      if (!products.length) return;
      try {
        const resp = await fetch(`/api/hms/stock/multi?products=${encodeURIComponent(products.join(","))}`, { credentials: "include" });
        if (!resp.ok) return;
        const j = await resp.json().catch(() => null);
        const data = j?.data || [];
        for (const p of data) {
          // emit stock:update per-batch or product-wide
          const msg: SocketMessage = { type: "stock:update", product_id: p.product_id, batch_id: p.batch_id ?? null, available_qty: p.available_qty ?? 0 };
          dispatchMessage(msg);
        }
      } catch (e) {
        // ignore network hiccups
      }
    }, pollIntervalMs);
  }, [pollIntervalMs, dispatchMessage]);

  const stopFallbackPolling = useCallback(() => {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  // public API
  const connect = useCallback(() => {
    setLastError(null);
    if (wsUrl) {
      setupWebsocket();
    } else {
      // start polling if ws not configured
      startFallbackPolling();
    }
  }, [wsUrl, setupWebsocket, startFallbackPolling]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) {}
      wsRef.current = null;
    }
    stopFallbackPolling();
    socketState.current = "closed";
    setConnected(false);
  }, [stopFallbackPolling]);

  // subscribe to product-level messages
  const subscribeProduct = useCallback((productId: string, fn: RealtimeEventHandler) => {
    if (!productId) throw new Error("productId required");
    let set = handlersByProduct.current.get(productId);
    if (!set) {
      set = new Set();
      handlersByProduct.current.set(productId, set);
    }
    set.add(fn);

    // try to notify server of interest (best-effort)
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "subscribe:product", product_id: productId }));
      }
    } catch {}

    return () => {
      const s = handlersByProduct.current.get(productId);
      if (!s) return;
      s.delete(fn);
      if (s.size === 0) handlersByProduct.current.delete(productId);
      // notify server unsubscribe
      try {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "unsubscribe:product", product_id: productId }));
        }
      } catch {}
    };
  }, []);

  const subscribeAll = useCallback((fn: RealtimeEventHandler) => {
    globalHandlers.current.add(fn);
    return () => {
      globalHandlers.current.delete(fn);
    };
  }, []);

  const sendHeartbeat = useCallback(() => {
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping", ts: Date.now() }));
      }
    } catch {}
  }, []);

  const getSocketState = useCallback(() => socketState.current, []);

  // cleanup on unmount
  useEffect(() => {
    // automatically connect on mount
    connect();

    const heartbeat = window.setInterval(() => {
      // if WS open, ping
      try {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const timeSincePong = nowMs() - lastPong.current;
          // if no pong for > 45s, restart socket
          if (timeSincePong > 45_000) {
            try { wsRef.current.close(); } catch (e) {}
            scheduleReconnect();
            return;
          }
          wsRef.current.send(JSON.stringify({ type: "ping", ts: Date.now() }));
        }
      } catch (e) { /* ignore */ }
    }, 20_000);

    return () => {
      window.clearInterval(heartbeat);
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If wsUrl not provided, ensure polling active
  useEffect(() => {
    if (!wsUrl) {
      startFallbackPolling();
    }
    return () => stopFallbackPolling();
  }, [wsUrl, startFallbackPolling, stopFallbackPolling]);

  return {
    connected,
    lastError,
    connect,
    disconnect,
    subscribeProduct,
    subscribeAll,
    sendHeartbeat,
    getSocketState,
  };
}
