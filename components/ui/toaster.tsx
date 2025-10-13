"use client";
import * as React from "react";
import { useToast, dismiss } from "@/components/ui/use-toast";

export function Toaster() {
  const { toasts } = useToast();
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto min-w-[240px] rounded-md border p-3 shadow ${
            t.variant === "destructive"
              ? "border-red-500/30 bg-red-500/10 text-red-100"
              : "border-white/10 bg-black/80 text-white"
          }`}
          onClick={() => dismiss(t.id)}
        >
          {t.title && <div className="text-sm font-medium">{t.title}</div>}
          {t.description && <div className="text-xs opacity-80">{t.description}</div>}
        </div>
      ))}
    </div>
  );
}
