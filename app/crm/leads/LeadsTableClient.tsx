// app/crm/leads/LeadsTableClient.tsx
"use client";

import { useMemo } from "react";
import type { LeadsListResponse } from "./page";

type Lead = LeadsListResponse["items"][number];

type Props = {
  initial?: LeadsListResponse | { leads: Lead[]; total?: number; page?: number; pageSize?: number };
};

// Stable, hydration-safe date: identical on server & client
const formatISO = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  // If iso already like "2025-09-19T..." it will still be fine
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
};

export default function LeadsTableClient({ initial }: Props) {
  // normalize initial rows whether {items} or {leads}
  const rows: Lead[] = useMemo(() => {
    if (!initial) return [];
    // prefer items but accept leads
    const arr = Array.isArray((initial as any).items)
      ? (initial as any).items
      : Array.isArray((initial as any).leads)
      ? (initial as any).leads
      : [];
    return Array.isArray(arr) ? arr : [];
  }, [initial]);

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr className="text-left">
              <th className="px-4 py-2 font-semibold">Name</th>
              <th className="px-4 py-2 font-semibold">Email</th>
              <th className="px-4 py-2 font-semibold">Phone</th>
              <th className="px-4 py-2 font-semibold">Company</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 font-semibold">Created</th>
              <th className="px-4 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((lead) => (
              <tr key={lead.id} className="hover:bg-white/5">
                <td className="px-4 py-2">{lead.name}</td>
                <td className="px-4 py-2 opacity-80">{lead.email ?? ""}</td>
                <td className="px-4 py-2 opacity-80">{lead.phone ?? ""}</td>
                <td className="px-4 py-2 opacity-80">{lead.company ?? ""}</td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs capitalize">
                    {lead.status}
                  </span>
                </td>

                {/* 🔒 Strict ISO so SSR & client match exactly */}
                <td className="px-4 py-2 text-xs opacity-70">
                  <time dateTime={lead.created_at}>{formatISO(lead.created_at)}</time>
                </td>

                <td className="px-4 py-2 text-right">
                  <a
                    href={`/crm/leads?edit=${encodeURIComponent(lead.id)}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/10"
                    title="Edit lead"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                      <path
                        fill="currentColor"
                        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83l3.75 3.75l1.84-1.82z"
                      />
                    </svg>
                    Edit
                  </a>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-sm opacity-70" colSpan={7}>
                  No leads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
