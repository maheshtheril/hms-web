// web/app/leads/admin/pipelines/page.tsx
"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PipelineList from "./PipelineList";

const queryClient = new QueryClient();

export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-6 space-y-4">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/6 border border-white/10 rounded-2xl p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Pipelines</h1>
          <p className="text-sm text-slate-300">
            Manage your sales pipelines across all tenants.
          </p>
        </div>

        {/* List Component */}
        <PipelineList />
      </div>
    </QueryClientProvider>
  );
}
