"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import apiClient, { generateIdempotencyKey, setIdempotencyKey } from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";

type Props = {
  appointmentId: string;
  initialStartsAt?: string | null;
  initialEndsAt?: string | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
};

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toISOStringFromLocal(input: string) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function RescheduleModal({ appointmentId, initialStartsAt, initialEndsAt, onClose, onSuccess }: Props) {
  const toast = useToast();
  const [startLocal, setStartLocal] = useState(() => toLocalInput(initialStartsAt));
  const [endLocal, setEndLocal] = useState(() => toLocalInput(initialEndsAt));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);

    const startIso = toISOStringFromLocal(startLocal);
    const endIso = toISOStringFromLocal(endLocal);

    if (!startIso || !endIso) {
      setError("Please provide valid start and end datetimes.");
      return;
    }
    if (new Date(startIso).getTime() >= new Date(endIso).getTime()) {
      setError("Start must be before end.");
      return;
    }

    setSubmitting(true);
    try {
      const idempotencyKey = generateIdempotencyKey("reschedule");

      await apiClient.put(
        `/hms/appointments/${encodeURIComponent(appointmentId)}/reschedule`,
        { newStartsAt: startIso, newEndsAt: endIso },
        setIdempotencyKey({}, idempotencyKey)
      );

      toast.success("Appointment rescheduled", "Saved");
      await Promise.resolve(onSuccess());
      onClose();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        const payload = err.response?.data ?? {};
        const conflictMsg =
          payload?.conflictIds && Array.isArray(payload.conflictIds)
            ? `Conflicts with: ${payload.conflictIds.join(", ")}`
            : payload?.error || "Conflict while rescheduling.";
        setError(conflictMsg);
        toast.error(conflictMsg, "Conflict");
        return;
      }
      console.error("RescheduleModal error:", err);
      const msg = err?.message || "Unexpected error";
      setError(msg);
      toast.error(msg, "Reschedule failed");
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
        transition={{ duration: 0.16 }}
        className="relative max-w-lg w-full bg-white/90 dark:bg-slate-900/90 rounded-2xl shadow-2xl p-6 backdrop-blur-md"
      >
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Reschedule appointment</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Adjust the start and end time for this appointment.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col text-sm">
            <span className="text-slate-700 dark:text-slate-200 text-xs mb-1">Start</span>
            <input
              autoFocus
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              type="datetime-local"
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-transparent focus:outline-none"
              required
            />
          </label>

          <label className="flex flex-col text-sm">
            <span className="text-slate-700 dark:text-slate-200 text-xs mb-1">End</span>
            <input
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
              type="datetime-local"
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-transparent focus:outline-none"
              required
            />
          </label>

          {error && <div className="text-rose-600 text-sm">{error}</div>}

          <div className="mt-2 flex gap-2 justify-end">
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
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
