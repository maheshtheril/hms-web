"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Props = {
  appointmentId: string;
  patientLabel?: string;
  initialReason?: string | null;
  onClose: () => void;
  onConfirm: (reason: string | null) => Promise<void>;
};

export default function ConfirmCancelModal({
  appointmentId,
  patientLabel,
  initialReason,
  onClose,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState<string>(initialReason ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  async function handleConfirm() {
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(reason || null);
    } catch (err: any) {
      console.error("Cancel confirm error", err);
      setError(err?.message ?? "Failed to cancel appointment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !submitting && onClose()} />

      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.14 }}
        className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 rounded-2xl p-5 shadow-2xl backdrop-blur-md"
      >
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Cancel appointment</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {patientLabel ? `Cancel appointment for ${patientLabel}.` : `Are you sure you want to cancel this appointment?`}
        </p>

        <div className="mt-4">
          <label className="text-xs text-slate-600 dark:text-slate-300 mb-1 block">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-transparent min-h-[80px] text-sm"
            placeholder="Optional note for the patient / internal note"
            disabled={submitting}
          />
        </div>

        {error && <div className="text-rose-600 text-sm mt-2">{error}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white disabled:opacity-60"
          >
            {submitting ? "Cancelling..." : "Confirm Cancel"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
