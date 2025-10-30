"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import EncounterForm from "./EncounterForm";
import RescheduleModal from "../appointments/RescheduleModal"; // optional reuse if needed

type Encounter = {
  id: string;
  patient_id: string;
  clinician_id: string;
  patient_first?: string;
  patient_last?: string;
  clinician_first?: string;
  clinician_last?: string;
  started_at?: string;
  ended_at?: string | null;
  status?: string | null;
  reason?: string | null;
  notes?: string | null;
  created_at?: string;
};

export default function EncountersPage() {
  const toast = useToast();
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ patient_id: "", clinician_id: "", from: "", to: "" });
  const [showForm, setShowForm] = useState(false);
  const [perRowLoading, setPerRowLoading] = useState<Record<string, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);

  async function fetchEncounters(signal?: AbortSignal) {
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const params = new URLSearchParams();
      Object.entries(filter).forEach(([k, v]) => v && params.append(k, v as string));
      const res = await apiClient.get(`/hms/encounters?${params.toString()}`, {
        signal: signal ?? abortRef.current.signal,
      });
      setEncounters(res.data?.data ?? []);
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.message === "canceled") return;
      console.error("fetchEncounters", err);
      toast.error(err?.message ?? "Failed to load encounters", "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEncounters();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setRowLoading(id: string, v: boolean) {
    setPerRowLoading((p) => ({ ...p, [id]: v }));
  }

  async function handleClose(enc: Encounter) {
    try {
      const ends = window.prompt("End time (local datetime e.g. 2025-10-30T15:00) — leave blank for now:", enc.ended_at?.slice(0, 16) ?? "");
      if (ends === null) return;
      const payload: any = {};
      if (ends) {
        const d = new Date(ends);
        if (Number.isNaN(d.getTime())) {
          toast.error("Invalid datetime");
          return;
        }
        payload.ended_at = d.toISOString();
      }
      payload.outcome = window.prompt("Outcome (optional):", "");
      payload.notes = window.prompt("Notes (optional):", "");

      setRowLoading(enc.id, true);
      const idempotencyKey = (await import("@/lib/api-client")).generateIdempotencyKey("encounter_close");
      await apiClient.put(`/hms/encounters/${encodeURIComponent(enc.id)}/close`, payload, { headers: { "Idempotency-Key": idempotencyKey } });

      toast.success("Encounter closed", "Saved");
      await fetchEncounters();
    } catch (err: any) {
      console.error("close encounter", err);
      toast.error(err?.message ?? "Failed to close encounter", "Error");
    } finally {
      setRowLoading(enc.id, false);
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800">
      <motion.header initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Encounters</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Clinical encounters & notes</p>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-blue-600 text-white">New Encounter</button>
          <button onClick={() => fetchEncounters()} className="px-3 py-2 rounded-xl border border-slate-200">Refresh</button>
        </div>
      </motion.header>

      <div className="max-w-6xl mx-auto space-y-4">
        <div className="p-3 rounded-2xl bg-white/80 dark:bg-white/5 backdrop-blur-md flex gap-2 flex-wrap">
          <input placeholder="Patient ID" value={filter.patient_id} onChange={(e)=>setFilter(s=>({...s, patient_id:e.target.value}))} className="px-2 py-2 rounded-xl border border-slate-200" />
          <input placeholder="Clinician ID" value={filter.clinician_id} onChange={(e)=>setFilter(s=>({...s, clinician_id:e.target.value}))} className="px-2 py-2 rounded-xl border border-slate-200" />
          <input type="date" value={filter.from} onChange={(e)=>setFilter(s=>({...s, from:e.target.value}))} className="px-2 py-2 rounded-xl border border-slate-200" />
          <input type="date" value={filter.to} onChange={(e)=>setFilter(s=>({...s, to:e.target.value}))} className="px-2 py-2 rounded-xl border border-slate-200" />
          <button onClick={() => fetchEncounters()} className="px-3 py-2 rounded-xl bg-blue-600 text-white">Filter</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {loading && <div className="text-center p-6">Loading...</div>}
          {!loading && encounters.length === 0 && <div className="text-slate-500 p-6 text-center">No encounters found</div>}
          {encounters.map((e) => {
            const busy = !!perRowLoading[e.id];
            return (
              <motion.div key={e.id} whileHover={{ scale: 1.01 }} className="p-4 rounded-2xl bg-white/90 dark:bg-slate-800/60 border border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-white">{e.patient_first ?? "—"} {e.patient_last ?? ""}</div>
                    <div className="text-xs text-slate-500">{e.clinician_first ?? "—"} {e.clinician_last ?? ""}</div>
                  </div>
                  <div className="text-xs text-slate-400">{new Date(e.created_at ?? e.started_at ?? "").toLocaleString()}</div>
                </div>

                <div className="mt-2 text-sm text-slate-600">{e.reason ?? "—"}</div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => handleView(e.id)} className="px-3 py-1 rounded-xl border">View</button>
                  <button onClick={() => handleEdit(e)} className="px-3 py-1 rounded-xl border">Edit</button>
                  <button onClick={() => handleClose(e)} disabled={busy} className="px-3 py-1 rounded-xl bg-emerald-600 text-white disabled:opacity-60">{busy ? "Working..." : "Close"}</button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {showForm && <EncounterForm onClose={() => { setShowForm(false); fetchEncounters(); }} onCreated={async ()=>{ await fetchEncounters(); toast.success("Encounter created", "Saved"); }} />}

    </div>
  );

  // small helpers (view/edit wiring)
  function handleView(id: string) {
    // route to detail page if you have one:
    // router.push(`/hms/encounters/${id}`);
    toast.info("Open encounter detail (not yet implemented)");
  }

  function handleEdit(enc: Encounter) {
    // reuse EncounterForm for edit in future
    toast.info("Edit encounter (not yet implemented)");
  }
}
