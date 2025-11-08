"use client";
import React from "react";
import SourceList from "./SourceList";

export default function Page() {
  return (
    <div className="p-6 space-y-4">
      <div className="backdrop-blur-xl bg-white/6 border border-white/10 rounded-2xl p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Sources</h1>
        <p className="text-sm text-slate-300">Manage lead sources (campaigns, referrals, channels).</p>
      </div>

      <SourceList />
    </div>
  );
}
