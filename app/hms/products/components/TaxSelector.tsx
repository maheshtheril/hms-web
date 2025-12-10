// web/app/hms/products/components/TaxSelector.tsx
"use client";

import { useState, useEffect } from "react";

export default function TaxSelector({
  taxRules,
  setTaxRules,
}: {
  taxRules: any[];
  setTaxRules: (v: any[]) => void;
}) {
  const [allTaxes, setAllTaxes] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/taxes")
      .then((r) => r.json())
      .then((res) => setAllTaxes(res));
  }, []);

  const add = () =>
    setTaxRules([
      ...taxRules,
      { tax_id: "", tax_name: "", rate: 0, account_id: null },
    ]);

  const update = (i: number, k: string, v: any) =>
    setTaxRules(
      taxRules.map((t, idx) => (idx === i ? { ...t, [k]: v } : t))
    );

  const remove = (i: number) =>
    setTaxRules(taxRules.filter((_, idx) => idx !== i));

  return (
    <div className="mt-10 space-y-6">

      <button
        onClick={add}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl"
      >
        Add Tax
      </button>

      {taxRules.map((t: any, i: number) => (
        <div
          key={i}
          className="p-5 bg-white/70 rounded-2xl border shadow-sm space-y-4"
        >
          {/* TAX SELECT */}
          <div>
            <label className="block font-medium">Tax</label>
            <select
              value={t.tax_id}
              onChange={(e) => {
                const tax = allTaxes.find(
                  (x) => x.id === e.target.value
                );
                update(i, "tax_id", e.target.value);
                update(i, "tax_name", tax?.name || "");
                update(i, "rate", tax?.rate || 0);
                update(i, "account_id", tax?.account_id || null);
              }}
              className="px-3 py-2 border rounded-xl w-full bg-white/60"
            >
              <option value="">Select Tax…</option>
              {allTaxes.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.rate}%)
                </option>
              ))}
            </select>
          </div>

          {/* RATE */}
          <div>
            <label className="block font-medium">Rate (%)</label>
            <input
              type="number"
              value={t.rate}
              onChange={(e) => update(i, "rate", parseFloat(e.target.value))}
              className="px-3 py-2 border rounded-xl w-full bg-white/60"
            />
          </div>

          {/* ACCOUNT */}
          <div>
            <label className="block font-medium">Account (optional)</label>
            <input
              value={t.account_id || ""}
              onChange={(e) => update(i, "account_id", e.target.value)}
              className="px-3 py-2 border rounded-xl w-full bg-white/60"
            />
          </div>

          <button
            onClick={() => remove(i)}
            className="px-3 py-2 bg-red-600 text-white rounded-xl"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
