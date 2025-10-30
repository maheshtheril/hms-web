"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import apiClient, { generateIdempotencyKey, setIdempotencyKey } from "@/lib/api-client";
import { useToast } from "@//components/toast/ToastProvider";

type Props = {
  onClose: () => void;
  onCreated?: (appt: any) => void;
};

export default function AppointmentsForm({ onClose, onCreated }: Props) {
  const toast = useToast();

  const [form, setForm] = useState({
    patient_id: "",
    clinician_id: "",
    starts_at: "",
    ends_at: "",
    notes: "",
    type: "consultation",
    mode: "in_person",
    priority: "normal",
    source: "ui",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // helper: format for input type="datetime-local" (YYYY-MM-DDTHH:mm)
  function toLocalDateTimeInput(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  }

  // helper: convert local datetime-local string -> ISO UTC
  function localToIso(s: string) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  // very small UUID-ish check (doesn't replace server validation)
  function looksLikeUUID(v?: string) {
    return typeof v === "string" && v.length >= 8 && /[0-9a-fA-F]/.test(v);
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);

    // basic validation
    if (!looksLikeUUID(form.patient_id) || !looksLikeUUID(form.clinician_id)) {
      setError("Patient and clinician IDs look invalid.");
      return;
    }
    if (!form.starts_at || !form.ends_at) {
      setError("Start and end time are required.");
      return;
    }
    const starts = localToIso(form.starts_at);
    const ends = localToIso(form.ends_at);
    if (!starts || !ends) {
      setError("Invalid start or end time.");
      return;
    }
    if (new Date(starts).getTime() >= new Date(ends).getTime()) {
      setError("Start must be before end.");
      return;
    }

    setSubmitting(true);
    try {
      // generate idempotency key client-side
      const idempotencyKey = generateIdempotencyKey("appointments");

      const payload = {
        patient_id: form.patient_id,
        clinician_id: form.clinician_id,
        starts_at: starts,
        ends_at: ends,
        notes: form.notes || null,
        type: form.type,
        mode: form.mode,
        priority: form.priority,
        source: form.source || "ui",
      };

      // send POST with Idempotency-Key header (safe to call repeatedly)
      const res = await apiClient.post("/hms/appointments", payload, setIdempotencyKey({}, idempotencyKey));

      // API expected shape: { appointment: { ... } } or plain appointment
      const created = res?.data?.appointment ?? res?.data;
      if (!created) {
        // fallback: if backend returns { data: { appointment } } or similar, try to guess
        const fallback = res?.data?.data ?? res?.data;
        if (fallback && fallback.appointment) {
          onCreated?.(fallback.appointment);
        } else {
          onCreated?.(res.data);
        }
      } else {
        onCreated?.(created);
      }

      // show polished toast instead of alert
      toast.success("Appointment created", "Saved");
      onClose();
    } catch (err: any) {
      console.error("create appointment error", err);
      // axios unified error may carry response data
      const serverMsg = err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message;
      const msg = String(serverMsg || "Failed to create appointment");
      setError(msg);
      toast.error(msg, "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !submitting && onClose()} />

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.12 }}
        className="relative w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 rounded-2xl p-6 shadow-2xl backdrop-blur-md"
      >
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">New Appointment</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Create a patient appointment</p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              placeholder="Patient ID"
              value={form.patient_id}
              onChange={(e) => setForm((s) => ({ ...s, patient_id: e.target.value }))}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-transparent"
              required
            />
            <input
              placeholder="Clinician ID"
              value={form.clinician_id}
              onChange={(e) => setForm((s) => ({ ...s, clinician_id: e.target.value }))}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-transparent"
              required
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="flex flex-col text-sm">
              <span className="text-xs text-slate-600 dark:text-slate-300 mb-1">Start</span>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm((s) => ({ ...s, starts_at: e.target.value }))}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-transparent"
                required
              />
            </label>

            <label className="flex flex-col text-sm">
              <span className="text-xs text-slate-600 dark:text-slate-300 mb-1">End</span>
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm((s) => ({ ...s, ends_at: e.target.value }))}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-transparent"
                required
              />
            </label>
          </div>

          <textarea
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-transparent min-h-[80px]"
          />

          {error && <div className="text-rose-600 text-sm">{error}</div>}

          <div className="flex justify-end items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => !submitting && onClose()}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create Appointment"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
