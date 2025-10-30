"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import apiClient, { generateIdempotencyKey, setIdempotencyKey } from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";

type Props = { onClose: () => void; onCreated?: (enc: any) => void; initial?: any };

export default function EncounterForm({ onClose, onCreated, initial }: Props) {
  const toast = useToast();
  const [form, setForm] = useState({
    patient_id: initial?.patient_id ?? "",
    clinician_id: initial?.clinician_id ?? "",
    appointment_id: initial?.appointment_id ?? "",
    started_at: initial?.started_at ? initial.started_at.slice(0,16) : "",
    ended_at: initial?.ended_at ? initial.ended_at.slice(0,16) : "",
    reason: initial?.metadata?.reason ?? initial?.reason ?? "",
    notes: initial?.metadata?.notes ?? initial?.notes ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function localToIso(s: string) {
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    if (!form.patient_id || !form.clinician_id) { setError("patient and clinician required"); return; }

    setSubmitting(true);
    try {
      if (initial?.id) {
        // update
        const payload: any = {
          reason: form.reason || null,
          notes: form.notes || null,
          appointment_id: form.appointment_id || null,
          started_at: localToIso(form.started_at) ?? undefined,
          ended_at: localToIso(form.ended_at) ?? undefined,
          clinician_id: form.clinician_id || undefined,
        };
        await apiClient.put(`/hms/encounters/${encodeURIComponent(initial.id)}`, payload);
        toast.success("Encounter updated", "Saved");
        onCreated?.({ ...initial, ...payload });
        onClose();
        return;
      }

      // create
      const idempotencyKey = generateIdempotencyKey("encounter");
      const payload = {
        patient_id: form.patient_id,
        clinician_id: form.clinician_id,
        appointment_id: form.appointment_id || null,
        started_at: localToIso(form.started_at),
        ended_at: localToIso(form.ended_at),
        reason: form.reason || null,
        notes: form.notes || null,
      };
      const res = await apiClient.post("/hms/encounters", payload, setIdempotencyKey({}, idempotencyKey));
      const created = res?.data?.encounter ?? res?.data;
      onCreated?.(created);
      toast.success("Encounter created", "Saved");
      onClose();
    } catch (err: any) {
      console.error("create/update encounter err", err);
      const msg = err?.response?.data?.message ?? err?.response?.data ?? err?.message ?? "Failed to save";
      setError(String(msg));
      toast.error(String(msg), "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !submitting && onClose()} />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12 }} className="relative w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 rounded-2xl p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{initial?.id ? "Edit Encounter" : "New Encounter"}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{initial?.id ? "Update encounter details" : "Record a patient encounter"}</p>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input placeholder="Patient ID" value={form.patient_id} onChange={(e)=>setForm(s=>({...s, patient_id: e.target.value}))} className="px-3 py-2 rounded-xl border" />
            <input placeholder="Clinician ID" value={form.clinician_id} onChange={(e)=>setForm(s=>({...s, clinician_id: e.target.value}))} className="px-3 py-2 rounded-xl border" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <input placeholder="Appointment ID (optional)" value={form.appointment_id} onChange={(e)=>setForm(s=>({...s, appointment_id: e.target.value}))} className="px-3 py-2 rounded-xl border" />
            <div className="grid grid-cols-2 gap-2">
              <input type="datetime-local" value={form.started_at} onChange={(e)=>setForm(s=>({...s, started_at: e.target.value}))} className="px-3 py-2 rounded-xl border" />
              <input type="datetime-local" value={form.ended_at} onChange={(e)=>setForm(s=>({...s, ended_at: e.target.value}))} className="px-3 py-2 rounded-xl border" />
            </div>
          </div>

          <input placeholder="Reason" value={form.reason} onChange={(e)=>setForm(s=>({...s, reason: e.target.value}))} className="px-3 py-2 rounded-xl border" />
          <textarea placeholder="Notes" value={form.notes} onChange={(e)=>setForm(s=>({...s, notes: e.target.value}))} className="px-3 py-2 rounded-xl border min-h-[80px]" />

          {error && <div className="text-rose-600 text-sm">{error}</div>}

          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={() => !submitting && onClose()} className="px-4 py-2 rounded-xl border">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-blue-600 text-white">{submitting ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
