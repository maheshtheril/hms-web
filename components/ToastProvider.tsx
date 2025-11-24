// /web/components/ToastProvider.tsx
"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type Toast = {
  id: string;
  title: string;
  description?: string;
  ttl?: number; // ms
};

type ToastContextType = {
  push: (t: Omit<Toast, "id">) => string;
  remove: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 7);
    const toast: Toast = { id, ...t };
    setToasts((s) => [toast, ...s]);
    if (t.ttl && t.ttl > 0) {
      setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), t.ttl);
    } else {
      // default ttl 5s
      setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 5000);
    }
    return id;
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((s) => s.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ push, remove }), [push, remove]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast container — simple, accessible, and styled for Neural Glass */}
      <div
        aria-live="polite"
        className="fixed right-6 bottom-6 z-[9999] flex flex-col gap-3 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto max-w-xs w-full rounded-2xl p-3 shadow-xl border bg-white/95 backdrop-blur-md"
            role="status"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="font-medium text-sm">{t.title}</div>
                {t.description && <div className="text-xs mt-1 opacity-85">{t.description}</div>}
              </div>
              <button
                onClick={() => remove(t.id)}
                aria-label="Dismiss toast"
                className="ml-3 text-xs opacity-70"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
