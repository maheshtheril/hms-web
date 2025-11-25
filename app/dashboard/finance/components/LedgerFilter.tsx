"use client";

import React, { useState } from "react";

interface Props {
  onFilter?: (payload: { accountId?: string; from?: string; to?: string; q?: string }) => void;
  initial?: { accountId?: string; from?: string; to?: string; q?: string };
}

export default function LedgerFilter({ onFilter, initial }: Props) {
  const [accountId, setAccountId] = useState(initial?.accountId ?? "");
  const [from, setFrom] = useState(initial?.from ?? "");
  const [to, setTo] = useState(initial?.to ?? "");
  const [q, setQ] = useState(initial?.q ?? "");

  const apply = () => {
    onFilter?.({ accountId: accountId || undefined, from: from || undefined, to: to || undefined, q: q || undefined });
  };

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="text-xs opacity-70">Account</label>
        <input
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          placeholder="Account id or name"
          className="block rounded-lg p-2 bg-white/6 border border-white/6"
        />
      </div>

      <div>
        <label className="text-xs opacity-70">From</label>
        <input value={from} onChange={(e) => setFrom(e.target.value)} type="date" className="rounded-lg p-2 bg-white/6 border border-white/6" />
      </div>

      <div>
        <label className="text-xs opacity-70">To</label>
        <input value={to} onChange={(e) => setTo(e.target.value)} type="date" className="rounded-lg p-2 bg-white/6 border border-white/6" />
      </div>

      <div>
        <label className="text-xs opacity-70">Search</label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Narration, ref, etc." className="rounded-lg p-2 bg-white/6 border border-white/6" />
      </div>

      <div>
        <button onClick={apply} className="px-3 py-2 rounded-md bg-indigo-600 text-white">
          Apply
        </button>
      </div>
    </div>
  );
}
