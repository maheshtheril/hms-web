"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/components/ui/toaster";

/**
 * Production-ready Providers (named export)
 * - QueryClientProvider (React Query v5)
 * - Toaster (global)
 * - ReactQueryDevtools (dev only)
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s
      gcTime: 1000 * 60 * 5, // 5m (v5: gcTime replaces cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30_000),
    },
    mutations: {
      retry: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
      {process.env.NODE_ENV !== "production" ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
