// app/leads/components/LeadList.tsx
"use client";
import React, { useEffect, useState } from "react";
import LeadRow from "./LeadRow";
import CreateLeadInline from "./CreateLeadInline";

export default function LeadList({ onSelect, onCreate }: any) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/leads", { credentials: "include" });
      const json = await res.json();
      setLeads(json.data || []);
    } catch (err) {
      console.error("Load leads error", err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = q.trim()
    ? leads.filter((l) => (l.name || "").toLowerCase().includes(q.toLowerCase()))
    : leads;

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search leads..."
          className="flex-1 bg-white/4 p-2 rounded-md text-white"
        />
        <button onClick={load} className="px-3 py-2 rounded-md bg-blue-600">
          {loading ? "..." : "Refresh"}
        </button>
      </div>

      <div className="mt-4 space-y-2 max-h-[60vh] overflow-auto">
        {filtered.length === 0 && !loading ? (
          <div className="text-white/70 p-4">No leads found.</div>
        ) : (
          filtered.map((l) => <LeadRow key={l.id} lead={l} onSelect={onSelect} />)
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
