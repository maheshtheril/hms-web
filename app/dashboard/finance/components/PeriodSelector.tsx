"use client";

import React from "react";

interface Props {
  value?: string;
  onChange?: (v: string) => void;
}

const presets = [
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "This Quarter", value: "this_quarter" },
  { label: "Year to Date", value: "ytd" },
];

export default function PeriodSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <select
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="rounded-lg p-2 bg-white/6 border border-white/6"
      >
        <option value="">Custom</option>
        {presets.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <input type="date" className="rounded-lg p-2 bg-white/6 border border-white/6" />
      <input type="date" className="rounded-lg p-2 bg-white/6 border border-white/6" />
      <button className="px-3 py-2 rounded-md bg-indigo-600 text-white">Apply</button>
    </div>
  );
}
