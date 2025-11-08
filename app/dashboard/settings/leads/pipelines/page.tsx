"use client";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PipelineList from "./PipelineList";

const queryClient = new QueryClient();

export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-6 space-y-4">
        <div className="backdrop-blur-xl bg-white/40 border border-white/10 rounded-2xl p-5 shadow-lg">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Pipelines
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your sales pipelines across all tenants.
          </p>
        </div>
        <PipelineList />
      </div>
    </QueryClientProvider>
  );
}
