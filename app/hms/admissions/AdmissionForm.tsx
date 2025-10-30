"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";

type Props = { onClose: () => void; onSaved?: () => void; initial?: any };

export default function AdmissionForm({ onClose, onSaved, initial }: Props) {
  const toast = useToast();
  const [form, setForm] = useState({
    patient_id: initial?.patient_id ?? "",
    encounter_id: initial?.encounter_id ?? "",
    ward: initial?.ward ?? "",
    bed: initial?.bed ?? "",
    admitting_doctor: initial?.admitting_doctor ?? "",
    notes: initial?.metadata?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkBedAvailability(ward?: string | null, bed?: string | null) {
    if (!ward || !bed) return { available: true };
    try {
      const res = await apiClient.get(`/hms/admissions/beds/available?ward=${encodeURIComponent(ward)}&bed=${encodeURIComponent(bed)}`);
      return res.data ?? { available: true };
    } catch (err) {
      console.warn("bed availability check failed", err);
      return { available: true }; // allow proceed but warn
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    if (!form.patient_id) { setError("patient required"); return; }

    setSaving(true);
    try {
      // pre-check bed availability if ward+bed provided
      if (form.ward && form.bed) {
        const avail = await checkBedAvailability(form.ward, form.bed);
        if (!avail.available) {
          setError(`Bed ${form.ward}/${form.bed} is occupied.`);
          toast.error(`Bed ${form.ward}/${form.bed} is occupied.`);
          setSaving(false);
          return;
        }
      }

      if (initial?.id) {
        // update
        await apiClient.put(`/hms/admissions/${encodeURIComponent(initial.id)}`, {
          ward: form.ward || null,
          bed: form.bed || null,
          admitting_doctor: form.admitting_doctor || null,
          metadata: { notes: form.notes || null },
        });
        toast.success("Admission updated", "Saved");
        onSaved?.();
        onClose();
        return;
      }

      // create
      const idKey = `adm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
      const res = await apiClient.post("/hms/admissions", {
        patient_id: form.patient_id,
        encounter_id: form.encounter_id || null,
        ward: form.ward || null,
        bed: form.bed || null,
        admitting_doctor: form.admitting_doctor || null,
        metadata: { notes: form.notes || null },
      }, { headers: { "Idempotency-Key": idKey } });

      toast.success("Admission created", "Saved");
      onSaved?.();
      onClose();
    } catch (err: any) {
      console.error("admission save err", err);
      const server = err?.response?.data;
      if (server?.error === "conflict" && server?.reason === "bed_occupied") {
        setError("That bed is occupied — please choose another bed.");
        toast.error("Bed occupied. Please choose another.");
      } else {
        setError(String(server?.error ?? err?.message ?? "Save failed"));
        toast.error(String(server?.error ?? err?.message ?? "Save failed"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={() => !saving && onClose()} />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-xl bg-white rounded-2xl p-6 shadow-2xl">
        <h3 className="text-lg font-semibold mb-1">{initial?.id ? "Edit Admission" : "New Admission"}</h3>
        <p className="text-sm text-slate-500 mb-3">{initial?.id ? "Update admission" : "Admit patient to ward/bed"}</p>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input placeholder="Patient ID" value={form.patient_id} onChange={(e)=>setForm(s=>({...s, patient_id:e.target.value}))} className="px-3 py-2 rounded-xl border" />
            <input placeholder="Encounter ID (optional)" value={form.encounter_id} onChange={(e)=>setForm(s=>({...s, encounter_id:e.target.value}))} className="px-3 py-2 rounded-xl border" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <input placeholder="Ward" value={form.ward} onChange={(e)=>setForm(s=>({...s, ward:e.target.value}))} className="px-3 py-2 rounded-xl border" />
            <input placeholder="Bed" value={form.bed} onChange={(e)=>setForm(s=>({...s, bed:e.target.value}))} className="px-3 py-2 rounded-xl border" />
          </div>

          <input placeholder="Admitting doctor ID" value={form.admitting_doctor} onChange={(e)=>setForm(s=>({...s, admitting_doctor:e.target.value}))} className="px-3 py-2 rounded-xl border" />
          <textarea placeholder="Notes" value={form.notes} onChange={(e)=>setForm(s=>({...s, notes:e.target.value}))} className="px-3 py-2 rounded-xl border min-h-[80px]" />

          {error && <div className="text-rose-600 text-sm">{error}</div>}

          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={()=>!saving && onClose()} className="px-4 py-2 rounded-xl border">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-blue-600 text-white">{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
