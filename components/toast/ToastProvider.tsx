"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

type ToastLevel = "success" | "error" | "info";
type ToastItem = { id: string; level: ToastLevel; title?: string; message: string; ttl?: number };

type ToastApi = {
  success: (msg: string, title?: string, ttl?: number) => string;
  error: (msg: string, title?: string, ttl?: number) => string;
  info: (msg: string, title?: string, ttl?: number) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

function genId() {
  return `${Date.now().toString(36)}_${Math.floor(Math.random() * 0xffffff).toString(16)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((level: ToastLevel, message: string, title?: string, ttl = 5000) => {
    const id = genId();
    const t: ToastItem = { id, level, message, title, ttl };
    setToasts((s) => [t, ...s].slice(0, 6)); // keep max 6
    if (ttl && ttl > 0) {
      setTimeout(() => {
        setToasts((s) => s.filter((x) => x.id !== id));
      }, ttl);
    }
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((s) => s.filter((t) => t.id !== id));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m, t, ttl) => push("success", m, t, ttl),
      error: (m, t, ttl) => push("error", m, t, ttl),
      info: (m, t, ttl) => push("info", m, t, ttl),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Toast container — top-right */}
      <div aria-live="polite" className="fixed right-4 top-4 z-[9999] flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 12, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 12, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="w-[320px] max-w-full"
            >
              <ToastCard toast={t} onClose={() => dismiss(t.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  // visuals per level
  const bg =
    toast.level === "success"
      ? "bg-emerald-600/95"
      : toast.level === "error"
      ? "bg-rose-600/95"
      : "bg-sky-600/95";
  const icon =
    toast.level === "success" ? "✓" : toast.level === "error" ? "✕" : "ℹ︎";

  return (
    <div
      role="status"
      className={`rounded-2xl p-3 shadow-lg backdrop-blur-md text-white ${bg} ring-1 ring-black/10`}
    >
      <div className="flex items-start gap-3">
        <div className="text-xl font-bold leading-none w-7 h-7 flex items-center justify-center">{icon}</div>

        <div className="flex-1 min-w-0">
          {toast.title && <div className="text-sm font-semibold">{toast.title}</div>}
          <div className="text-sm leading-snug mt-0.5 break-words">{toast.message}</div>
        </div>

        <button
          onClick={onClose}
          aria-label="Dismiss toast"
          className="opacity-90 hover:opacity-100 ml-2 p-1 rounded-md"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // defensive fallback so components can call toast.* without crashing in tests
    return {
      success: (m) => { console.warn("toast.success:", m); return ""; },
      error: (m) => { console.warn("toast.error:", m); return ""; },
      info: (m) => { console.warn("toast.info:", m); return ""; },
      dismiss: (id) => { /* noop */ },
    };
  }
  return ctx;
}
