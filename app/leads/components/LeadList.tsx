// app/leads/components/LeadList.tsx
"use client";
import React, { useEffect, useState, useMemo } from "react";
import LeadRow from "./LeadRow";
import CreateLeadInline from "./CreateLeadInline";

type Props = {
  onSelect?: (id: string) => void;
  onCreate?: (id: string) => void;
};

export default function LeadList({ onSelect, onCreate }: Props) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    load({ signal: ac.signal });
    return () => ac.abort();
  }, []);

  async function load(opts: { signal?: AbortSignal } = {}) {
    setLoading(true);
    try {
      const res = await fetch("/api/leads", { credentials: "include", signal: opts.signal });
      if (!res.ok) {
        // surface server error if present
        let msg = `Failed to load leads (status ${res.status})`;
        try { const body = await res.json(); if (body?.error) msg += `: ${body.error}`; } catch {}
        console.error(msg);
        setLeads([]);
        return;
      }
      const json = await res.json();
      const items = json?.data ?? json?.items ?? [];
      setLeads(Array.isArray(items) ? items : []);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Load leads error", err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter((l) => String(l?.name ?? "").toLowerCase().includes(term));
  }, [leads, q]);

  return (
    <div>
      <div className="flex gap-2 items-center">
        <label htmlFor="lead-search" className="sr-only">Search leads</label>
        <input
          id="lead-search"
          aria-label="Search leads"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search leads..."
          className="flex-1 bg-white/4 p-2 rounded-md text-white"
        />
        <button
          onClick={() => load()}
          className="px-3 py-2 rounded-md bg-blue-600 text-white"
          aria-label="Refresh leads"
        >
          {loading ? "..." : "Refresh"}
        </button>
      </div>

      <div className="mt-4 space-y-2 max-h-[60vh] overflow-auto">
        {!loading && filtered.length === 0 ? (
          <div className="text-white/70 p-4">
            {leads.length === 0 ? "No leads found." : "No results for your search."}
          </div>
        ) : loading && filtered.length === 0 ? (
          <div className="text-white/70 p-4">Loading…</div>
        ) : (
          filtered.map((l) => (
            // ensure onSelect receives the id
            <LeadRow key={l.id} lead={l} onSelect={() => onSelect?.(l.id)} />
          ))
        )}
      </div>

      <div className="mt-4">
        <CreateLeadInline
          onCreate={(lead: any) => {
            setLeads((s) => [lead, ...s]);
            onCreate?.(lead.id);
          }}
        />
      </div>
    </div>
  );
}
