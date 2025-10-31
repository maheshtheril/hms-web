// app/leads/components/useToast.ts
"use client";
import { useCallback } from "react";

export function useToast() {
  const push = useCallback((opts: { title?: string; description?: string } = {}) => {
    // Minimal non-blocking fallback. Replace with your app's toast provider.
    if (typeof window !== "undefined") {
      // Non-intrusive: console + small transient DOM fallback could be added.
      // For simplicity, log to console; you can swap this with your toast system.
      console.info("TOAST:", opts.title, opts.description || "");
    }
  }, []);
  return { push };
}
