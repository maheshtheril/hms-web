// web/app/dashboard/settings/taxes/TaxList.tsx
"use client";

import React from "react";
import type { TaxRateRow } from "./types";

type Props = {
  list: TaxRateRow[];
  loading: boolean;
  onEdit: (r: TaxRateRow) => void;
};

export default function TaxList({ list, loading, onEdit }: Props): JSX.Element {
  if (loading) return <p className="text-white">Loading…</p>;
  if (!list || list.length === 0) return <p className="text-white/70">No tax rates found.</p>;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {list.map((t) => (
        <div key={t.id} className="p-4 rounded-2xl bg-white/8 backdrop-blur-xl border border-white/10">
          <div className="flex justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {t.name} <span className="text-sm text-white/60">({t.type})</span>
              </h3>
              <p className="text-white/70">Rate: {(t.rate * 100).toFixed(2)}%</p>
              <p className="text-white/60 text-xs">
                {t.country ?? "—"} {t.state ? `· ${t.state}` : ""} {t.city ? `· ${t.city}` : ""}
              </p>
              <p className="text-white/60 text-xs mt-1">
                {t.company_id ? "Company override" : t.tenant_id ? "Tenant default" : "Global default"}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button onClick={() => onEdit(t)} className="px-3 py-1 rounded-lg bg-blue-500/70 text-white">
                Edit
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
