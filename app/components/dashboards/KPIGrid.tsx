// app/components/dashboards/KPIGrid.tsx
"use client";
import React from "react";

type KPI = { id: string; title: string; value: string | number; delta?: string };

export default function KPIGrid({ items }: { items: KPI[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {items.map((k) => (
        <div
          key={k.id}
          className="p-4 rounded-2xl bg-neutral-900/20 shadow-soft min-h-[88px] flex flex-col justify-between"
        >
          <div className="text-sm text-neutral-300">{k.title}</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-semibold">{k.value}</div>
            {k.delta ? <div className="text-sm text-emerald-400">{k.delta}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
