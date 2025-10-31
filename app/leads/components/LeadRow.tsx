// app/leads/components/LeadRow.tsx
"use client";
import React from "react";

export default function LeadRow({ lead, onSelect }: any) {
  return (
    <div
      onClick={() => onSelect(lead.id)}
      className="flex items-center justify-between gap-4 p-3 hover:bg-white/2 rounded-lg cursor-pointer transition-all duration-150"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(lead.id); }}
    >
      <div>
        <div className="text-white font-semibold">{lead.name}</div>
        <div className="text-white/70 text-sm">{lead.primary_email ?? lead.primary_phone ?? "—"}</div>
      </div>
      <div className="text-sm text-white/60">{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "-"}</div>
    </div>
  );
}
