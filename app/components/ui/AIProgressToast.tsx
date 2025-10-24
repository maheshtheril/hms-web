"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

type ToastStatus = "loading" | "success" | "error" | "info";

type AIToast = {
  id: string;
  title: string;
  description?: string;
  status: ToastStatus;
  progress?: number; // 0-100 (optional)
  createdAt: number;
};

type Controller = {
  start: (opts: { id?: string; title: string; description?: string }) => string;
  update: (id: string, opts: Partial<Pick<AIToast, "title" | "description" | "progress"> & { status?: ToastStatus }>) => void;
  success: (id: string, title?: string, description?: string) => void;
  error: (id: string, title?: string, description?: string) => void;
  dismiss: (id: string) => void;
};

const CONTAINER_ID = "ai-progress-toast-root";

function ensureRoot() {
  let root = document.getElementById(CONTAINER_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = CONTAINER_ID;
    document.body.appendChild(root);
  }
  return root;
}

/**
 * AIProgressToastManager
 * - Mount this once (Providers or RootLayout)
 * - Control toasts via `window.__aiToast` or import the exported `aiToast` helper below.
 */
export default function AIProgressToastManager() {
  const [toasts, setToasts] = useState<AIToast[]>([]);

  // controller functions
  const controller = useMemo<Controller>(() => {
    function addToast(t: AIToast) {
      setToasts((prev) => [t, ...prev].slice(0, 6));
    }
    function findIndex(id: string) {
      return -1; // placeholder
    }

    return {
      start: ({ id, title, description }: { id?: string; title: string; description?: string }) => {
        const newId = id ?? `ai-${Math.random().toString(36).slice(2, 9)}`;
        const t: AIToast = {
          id: newId,
          title,
          description,
          status: "loading",
          progress: undefined,
          createdAt: Date.now(),
        };
        addToast(t);
        return newId;
      },

      update: (id, opts) => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...opts, createdAt: Date.now() } : t))
        );
      },

      success: (id, title?: string, description?: string) => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: "success", title: title ?? t.title, description: description ?? t.description } : t))
        );
        // auto dismiss after short delay
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 1200);
      },

      error: (id, title?: string, description?: string) => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: "error", title: title ?? t.title, description: description ?? t.description } : t))
        );
        // keep slightly longer
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 2200);
      },

      dismiss: (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      },
    };
  }, []);

  // attach to window for global access
  useEffect(() => {
    (window as any).__aiToast = controller;
    return () => {
      try {
        delete (window as any).__aiToast;
      } catch {}
    };
  }, [controller]);

  // ensure DOM root and render portal
  const root = typeof window !== "undefined" ? ensureRoot() : null;
  if (!root) return null;

  return createPortal(
    <div className="pointer-events-none fixed top-5 right-5 z-50 flex flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            "pointer-events-auto max-w-xs w-[320px] rounded-2xl p-3 shadow-xl backdrop-blur-md",
            t.status === "loading" && "bg-black/60 border border-white/10",
            t.status === "success" && "bg-emerald-700/20 border border-emerald-400/30",
            t.status === "error" && "bg-rose-800/20 border border-rose-400/30",
            t.status === "info" && "bg-blue-800/20 border border-blue-400/30"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0">
              {t.status === "loading" ? (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.15" />
                  <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : t.status === "success" ? (
                <span className="text-2xl">✅</span>
              ) : t.status === "error" ? (
                <span className="text-2xl">❌</span>
              ) : (
                <span className="text-2xl">💡</span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold truncate">{t.title}</div>
                <div className="text-[11px] opacity-60">{new Date(t.createdAt).toLocaleTimeString()}</div>
              </div>
              {t.description && <div className="mt-1 text-xs opacity-70 truncate">{t.description}</div>}

              {typeof t.progress === "number" && (
                <div className="mt-2 h-2 w-full rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full bg-emerald-400/80 transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, t.progress))}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>,
    root
  );
}
