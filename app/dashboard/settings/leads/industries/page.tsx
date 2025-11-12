// web/app/leads/admin/industries/page.tsx
"use client";
import React from "react";
import IndustryList from "./IndustryList";

export default function Page() {
  return (
    <div className="p-6 space-y-4">
      {/* Header Card */}
      <div className="backdrop-blur-xl bg-white/6 border border-white/10 rounded-2xl p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Industries (Admin)</h1>
        <p className="text-sm text-slate-300">
          Manage industry categories used for lead classification across tenants.
        </p>
      </div>

      {/* List Component */}
      <IndustryList />
    </div>
  );
}
