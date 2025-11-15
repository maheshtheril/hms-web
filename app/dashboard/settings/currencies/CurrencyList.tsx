// web/app/dashboard/settings/currencies/CurrencyList.tsx
"use client";

import React from "react";
import type { CurrencyRow } from "./types";

type Props = {
  list: CurrencyRow[];
  loading: boolean;
  onEdit: (c: CurrencyRow) => void;
};

export default function CurrencyList({ list, loading, onEdit }: Props) {
  if (loading) return <p className="text-white">Loading…</p>;
  if (!list || list.length === 0) return <p className="text-white/70">No currencies found.</p>;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {list.map((c) => (
        <div
          key={`${c.code}-${c.company_id ?? "global"}-${c.tenant_id ?? "global"}`}
          className="p-4 rounded-2xl bg-white/10 backdrop-blur-xl shadow-lg border border-white/20 hover:bg-white/20 transition"
        >
          <div className="flex justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">{c.code}</h3>
              <p className="text-white/70 text-sm">{c.symbol}</p>
              <p className="text-white/70 text-sm">{c.locale ?? ""}</p>
              <p className="text-white/70 text-xs mt-1">Precision: {c.precision}</p>
              <p className="text-white/60 text-xs">
                {c.company_id ? "Company" : c.tenant_id ? "Tenant" : "Global"}
              </p>
            </div>

            <button
              onClick={() => onEdit(c)}
              className="px-3 py-1 rounded-lg bg-blue-500/70 text-white hover:bg-blue-600"
            >
              Edit
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
