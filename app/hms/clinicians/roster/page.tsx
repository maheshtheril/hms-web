"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Calendar, Download, Loader2, Check, X } from "lucide-react";
import apiClient from "@/lib/api-client";
import Link from "next/link";

// --- Neural Glass local UI primitives (self-contained) ---
function Button({ children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl text-sm font-semibold transition-all transform will-change-transform ${className}`}
    >
      {children}
    </button>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 border border-white/10 backdrop-blur-xl ${className}`}>
      {/* subtle gradient sheen */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-indigo-400/4 to-cyan-300/3 mix-blend-screen" />
      {/* soft vignette */}
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_60px_120px_rgba(0,0,0,0.12)]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// --- Types ---
type RosterEntry = {
  id: string;
  clinician_id: string;
  clinician_name: string;
  department: string;
  shift_start: string; // ISO string
  shift_end: string; // ISO string
  status: "on_call" | "off_call";
};

// --- Helpers ---
function formatDateTime(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch (e) {
    return iso;
  }
}

function downloadCSV(rows: Record<string, any>[], filename = "roster.csv") {
  if (!rows || rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  // fixed newline join
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Main page ---
export default function OnCallRosterPage() {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  });

  const [departmentFilter, setDepartmentFilter] = useState<string | "">("");
  const [clinicianFilter, setClinicianFilter] = useState<string | "">("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get("/hms/clinicians/roster", { params: { from: dateFrom, to: dateTo } });
        const data = (res && res.data && res.data.data) || [];
        if (!cancel) setRoster(data);
      } catch (err: any) {
        console.error("Failed to fetch roster", err);
        setError(err?.message || "Failed to fetch roster");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [dateFrom, dateTo]);

  const departments = useMemo(() => Array.from(new Set(roster.map((r) => r.department))).sort(), [roster]);
  const clinicians = useMemo(() => Array.from(new Set(roster.map((r) => r.clinician_name))).sort(), [roster]);

  const filtered = useMemo(() => {
    return roster.filter((r) => {
      if (departmentFilter && r.department !== departmentFilter) return false;
      if (clinicianFilter && r.clinician_name !== clinicianFilter) return false;
      return true;
    });
  }, [roster, departmentFilter, clinicianFilter]);

  async function toggleStatus(id: string) {
    setRoster((prev) => prev.map((r) => (r.id === id ? { ...r, status: r.status === "on_call" ? "off_call" : "on_call" } : r)));
    try {
      await apiClient.patch(`/hms/clinicians/roster/${id}`, {});
    } catch (e) {
      console.error("failed to persist", e);
    }
  }

  function exportCSV() {
    const rows = filtered.map((r) => ({
      clinician: r.clinician_name,
      department: r.department,
      shift_start: r.shift_start,
      shift_end: r.shift_end,
      status: r.status,
    }));
    downloadCSV(rows, `oncall-roster-${dateFrom}_to_${dateTo}.csv`);
  }

  const groupedByDate = useMemo(() => {
    const map = new Map<string, RosterEntry[]>();
    filtered.forEach((r) => {
      const day = new Date(r.shift_start).toISOString().slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(r);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div className="min-h-screen p-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/3 to-white/6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white/95 tracking-tight drop-shadow">On-call Roster</h1>
            <p className="text-sm opacity-70 mt-1">Showing <span className="font-medium">{filtered.length}</span> shifts • <span className="font-mono">{dateFrom}</span> → <span className="font-mono">{dateTo}</span></p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={exportCSV} className="border border-white/10 bg-white/6 hover:scale-[1.02]">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Link href="/hms/clinicians/roster/new">
              <Button className="bg-gradient-to-br from-cyan-400/10 to-violet-400/8 border border-white/12 backdrop-blur-md">
                <Plus className="h-4 w-4" /> New Shift
              </Button>
            </Link>
          </div>
        </div>

        <GlassCard className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3 relative z-10">
            <div className="flex items-center gap-2">
              <label className="text-sm mr-1">From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded px-3 py-2 bg-white/5 border border-white/8" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm mr-1">To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded px-3 py-2 bg-white/5 border border-white/8" />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm">Department</label>
              <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="rounded px-3 py-2 bg-white/4 border border-white/8">
                <option value="">All</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm">Clinician</label>
              <select value={clinicianFilter} onChange={(e) => setClinicianFilter(e.target.value)} className="rounded px-3 py-2 bg-white/4 border border-white/8">
                <option value="">All</option>
                {clinicians.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="ml-auto" />
          </div>
        </GlassCard>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-white/80" />
          </div>
        ) : error ? (
          <div className="p-6 rounded bg-red-600/10 border border-red-600/10">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groupedByDate.map(([day, entries]) => (
              <motion.div key={day} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
                <GlassCard className="space-y-3 hover:shadow-[0_8px_40px_rgba(99,102,241,0.08)] transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold text-white/95">{new Date(day).toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })}</div>
                      <div className="text-xs opacity-60">{day}</div>
                    </div>
                    <Calendar className="h-5 w-5 opacity-70" />
                  </div>

                  <div className="space-y-2">
                    {entries.map((e) => (
                      <motion.div key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }} className="flex items-center justify-between p-3 rounded-xl bg-white/6 border border-white/6 backdrop-blur-lg">
                        <div>
                          <div className="font-medium text-white/95">{e.clinician_name}</div>
                          <div className="text-xs opacity-70">{e.department}</div>
                          <div className="text-xs opacity-60">{formatDateTime(e.shift_start)} → {formatDateTime(e.shift_end)}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button onClick={() => toggleStatus(e.id)} className={`text-xs border px-3 rounded-lg ${e.status === "on_call" ? "bg-emerald-400/10 text-emerald-300 border-emerald-300/20" : "bg-red-400/8 text-rose-300 border-rose-300/20"}`}>
                            {e.status === "on_call" ? <><Check className="h-4 w-4" /> <span className="ml-1">On Call</span></> : <><X className="h-4 w-4" /> <span className="ml-1">Off</span></>}
                          </Button>

                          <Link href={`/hms/clinicians/roster/${e.id}`}>
                            <Button className="text-xs border px-2 bg-white/4">View</Button>
                          </Link>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
