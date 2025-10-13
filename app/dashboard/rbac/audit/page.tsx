// path: app/dashboard/rbac/audit/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";

type AuditRow = {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  table_name?: string;
  row_id?: string;
  data?: any;
  ip?: string;
  user_agent?: string;
  created_at: string;
};

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function load() {
    const r = await apiClient.get("/audit-logs", {
      params: { page, pageSize, search, action, date_from: dateFrom, date_to: dateTo }
    });
    const d = r.data;
    setRows(d?.items || d || []);
    setTotal(d?.meta?.total || (d?.items ? d.items.length : rows.length));
  }
  useEffect(() => { load().catch(()=>{}); }, [page, pageSize]);

  function openDiff(row: AuditRow) {
    const payload = row?.data || {};
    const before = payload?.before || {};
    const after = payload?.after || {};
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
    const lines = keys.map(k => `${k}: ${JSON.stringify(before[k])}  →  ${JSON.stringify(after[k])}`).join("\n");
    alert(`Row ${row.row_id || ""} (table: ${row.table_name || ""})\n\n` + lines);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <input className="bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Search email, table, row…"
               value={search} onChange={e=>setSearch(e.target.value)} />
        <input className="bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Action (CREATE/UPDATE/DELETE/login)"
               value={action} onChange={e=>setAction(e.target.value)} />
        <input type="date" className="bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
        <input type="date" className="bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
        <button onClick={()=>{ setPage(1); load(); }} className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/10">Apply</button>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left px-3 py-2">Time</th>
              <th className="text-left px-3 py-2">User</th>
              <th className="text-left px-3 py-2">Action</th>
              <th className="text-left px-3 py-2">Table</th>
              <th className="text-left px-3 py-2">Row</th>
              <th className="text-left px-3 py-2">IP</th>
              <th className="text-right px-3 py-2">Diff</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="px-3 py-2">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-3 py-2">{r.user_email || r.user_id}</td>
                <td className="px-3 py-2">{r.action}</td>
                <td className="px-3 py-2">{r.table_name}</td>
                <td className="px-3 py-2">{r.row_id}</td>
                <td className="px-3 py-2">{r.ip}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={()=>openDiff(r)} className="rounded-md border border-white/10 px-2 py-1 hover:bg-white/10">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div>Page {page} / {Math.max(1, Math.ceil(total / pageSize))} · {total} events</div>
        <div className="flex items-center gap-2">
          <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-white/10 px-2 py-1 disabled:opacity-50">Prev</button>
          <button disabled={page>=Math.ceil((total||1)/pageSize)} onClick={()=>setPage(p=>p+1)} className="rounded-md border border-white/10 px-2 py-1 disabled:opacity-50">Next</button>
          <select value={pageSize} onChange={e=>{ setPageSize(parseInt(e.target.value)); setPage(1); }} className="ml-2 bg-transparent border border-white/10 rounded px-2 py-1">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
    </div>
  );
}
