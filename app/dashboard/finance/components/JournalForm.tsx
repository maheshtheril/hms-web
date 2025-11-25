"use client";

import React, { useMemo, useState } from "react";
import FinanceGlassPanel from "./FinanceGlassPanel";

type Line = {
  id: string;
  account_id?: string;
  account_name?: string;
  debit?: number;
  credit?: number;
  narration?: string;
};

interface Props {
  initial?: {
    date?: string;
    ref?: string;
    lines?: Line[];
  };
  onSubmit?: (payload: any) => Promise<void> | void;
}

function sumLines(lines: Line[]) {
  return lines.reduce(
    (acc, l) => {
      acc.debit += Number(l.debit || 0);
      acc.credit += Number(l.credit || 0);
      return acc;
    },
    { debit: 0, credit: 0 }
  );
}

export default function JournalForm({ initial, onSubmit }: Props) {
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [ref, setRef] = useState(initial?.ref ?? "");
  const [lines, setLines] = useState<Line[]>(
    initial?.lines ?? [{ id: crypto.randomUUID(), account_name: "", debit: 0, credit: 0 }]
  );
  const totals = useMemo(() => sumLines(lines), [lines]);

  const setLine = (id: string, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const addLine = () =>
    setLines((ls) => [...ls, { id: crypto.randomUUID(), account_name: "", debit: 0, credit: 0 }]);

  const removeLine = (id: string) => setLines((ls) => ls.filter((l) => l.id !== id));

  const handleSubmit = async () => {
    if (totals.debit !== totals.credit) {
      alert("Debits and Credits must balance.");
      return;
    }
    const payload = { date, ref, lines };
    try {
      await onSubmit?.(payload);
    } catch (e) {
      console.error(e);
      alert("Submit failed");
    }
  };

  return (
    <FinanceGlassPanel title="New Journal Entry" subtitle="Create double-entry journal">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs opacity-60">Date</label>
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            type="date"
            className="w-full rounded-lg p-2 bg-white/6 border border-white/6"
          />
        </div>
        <div>
          <label className="text-xs opacity-60">Reference</label>
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            className="w-full rounded-lg p-2 bg-white/6 border border-white/6"
            placeholder="Ref / Invoice #"
          />
        </div>
      </div>

      <div className="space-y-3">
        {lines.map((l, idx) => (
          <div key={l.id} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-5">
              <input
                value={l.account_name}
                onChange={(e) => setLine(l.id, { account_name: e.target.value })}
                placeholder="Account name"
                className="w-full rounded-lg p-2 bg-white/6 border border-white/6"
              />
            </div>

            <div className="col-span-2">
              <input
                value={l.debit ?? ""}
                onChange={(e) => setLine(l.id, { debit: Number(e.target.value || 0) })}
                placeholder="Debit"
                type="number"
                className="w-full rounded-lg p-2 bg-white/6 border border-white/6 text-right"
              />
            </div>

            <div className="col-span-2">
              <input
                value={l.credit ?? ""}
                onChange={(e) => setLine(l.id, { credit: Number(e.target.value || 0) })}
                placeholder="Credit"
                type="number"
                className="w-full rounded-lg p-2 bg-white/6 border border-white/6 text-right"
              />
            </div>

            <div className="col-span-2">
              <input
                value={l.narration ?? ""}
                onChange={(e) => setLine(l.id, { narration: e.target.value })}
                placeholder="Narration"
                className="w-full rounded-lg p-2 bg-white/6 border border-white/6"
              />
            </div>

            <div className="col-span-1">
              <button
                onClick={() => removeLine(l.id)}
                className="px-2 py-1 rounded-md bg-red-600/20 text-sm"
                aria-label="Remove line"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm opacity-70">
          Totals — Debit: <strong>{totals.debit.toFixed(2)}</strong>{" "}
          Credit: <strong>{totals.credit.toFixed(2)}</strong>
        </div>

        <div className="flex gap-2">
          <button onClick={addLine} className="px-3 py-2 rounded-md bg-white/6">
            + Line
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 rounded-md bg-indigo-600 text-white">
            Post Journal
          </button>
        </div>
      </div>
    </FinanceGlassPanel>
  );
}
