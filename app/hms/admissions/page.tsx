"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import AdmissionForm from "./AdmissionForm";
import { useRouter } from "next/navigation";

export default function AdmissionsPage() {
  const toast = useToast();
  const router = useRouter();
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ patient_id: "", ward: "", status: "" });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function fetchAdmissions() {
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const params = new URLSearchParams();
      Object.entries(filter).forEach(([k, v]) => v && params.append(k, v));
      const res = await apiClient.get(`/hms/admissions?${params.toString()}`, { signal: abortRef.current.signal });
      setAdmissions(res.data?.data ?? []);
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.message === "canceled") return;
      console.error("fetchAdmissions", err);
      toast.error(err?.message ?? "Failed to load admissions", "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAdmissions();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function view(id: string) {
    router.push(`/hms/admissions/${encodeURIComponent(id)}`);
  }

  function edit(a: any) {
    setEditing(a);
    setShowForm(true);
  }

  async function discharge(a: any) {
    try {
      const ok = confirm(`Discharge patient ${a.patient_name ?? a.patient_id}?`);
      if (!ok) return;
      const notes = prompt("Discharge notes (optional):", "");
      await apiClient.put(`/hms/admissions/${encodeURIComponent(a.id)}/discharge`, { notes });
      toast.success("Discharged", "Saved");
      await fetchAdmissions();
    } catch (err: any) {
      console.error("discharge", err);
      toast.error(err?.message ?? "Failed to discharge", "Error");
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800">
      <motion.header initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Admissions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Ward, bed & inpatient management</p>
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="px-4 py-2 rounded-xl bg-blue-600 text-white">New Admission</button>
          <button onClick={() => fetchAdmissions()} className="px-3 py-2 rounded-xl border border-slate-200">Refresh</button>
        </div>
      </motion.header>

      <div className="max-w-6xl mx-auto space-y-4">
        <div className="p-3 rounded-2xl bg-white/80 backdrop-blur-md flex gap-2 flex-wrap">
          <input placeholder="Patient ID" value={filter.patient_id} onChange={(e)=>setFilter(s=>({...s, patient_id:e.target.value}))} className="px-2 py-2 rounded-xl border border-slate-200" />
          <input placeholder="Ward" value={filter.ward} onChange={(e)=>setFilter(s=>({...s, ward:e.target.value}))} className="px-2 py-2 rounded-xl border border-slate-200" />
          <select value={filter.status} onChange={(e)=>setFilter(s=>({...s, status:e.target.value}))} className="px-2 py-2 rounded-xl border border-slate-200">
            <option value="">All</option>
            <option value="admitted">Admitted</option>
            <option value="discharged">Discharged</option>
          </select>
          <button onClick={() => fetchAdmissions()} className="px-3 py-2 rounded-xl bg-blue-600 text-white">Filter</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {loading && <div className="text-center p-6">Loading...</div>}
          {!loading && admissions.length === 0 && <div className="text-slate-500 p-6 text-center">No admissions found</div>}
          {admissions.map(a => (
            <motion.div key={a.id} whileHover={{ scale: 1.01 }} className="p-4 rounded-2xl bg-white/90 dark:bg-slate-800/60 border border-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-white">{a.patient_name ?? "—"}</div>
                  <div className="text-xs text-slate-500">{a.ward ?? "—"} • Bed {a.bed ?? "—"}</div>
                </div>
                <div className="text-xs text-slate-400">{new Date(a.admitted_at).toLocaleString()}</div>
              </div>

              <div className="mt-2 text-sm text-slate-600">{a.metadata?.notes ?? ""}</div>

              <div className="mt-3 flex gap-2">
                <button onClick={() => view(a.id)} className="px-3 py-1 rounded-xl border">View</button>
                <button onClick={() => edit(a)} className="px-3 py-1 rounded-xl border">Edit</button>
                <button onClick={() => discharge(a)} className="px-3 py-1 rounded-xl bg-amber-600 text-white">Discharge</button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {showForm && (
        <AdmissionForm
          initial={editing ?? undefined}
          onClose={() => { setShowForm(false); setEditing(null); fetchAdmissions(); }}
          onSaved={async () => { await fetchAdmissions(); toast.success("Saved", "Saved"); }}
        />
      )}
    </div>
  );
}
