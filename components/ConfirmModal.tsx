// components/ConfirmModal.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title = "Confirm",
  description = "Are you sure?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  // focus the confirm button when opened
  useEffect(() => {
    if (open) {
      const to = setTimeout(() => ref.current?.focus(), 60);
      return () => clearTimeout(to);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter" && !loading) onConfirm();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => { if (!loading) onCancel(); }}
        aria-hidden="true"
      />
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 w-full max-w-md p-6 bg-white rounded-2xl shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
      >
        <h3 id="confirm-title" className="text-lg font-semibold text-slate-900">{title}</h3>
        <p id="confirm-desc" className="mt-2 text-sm text-slate-600">{description}</p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            ref={ref}
            onClick={() => { if (!loading) onConfirm(); }}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-rose-600 text-white hover:brightness-105 disabled:opacity-60"
          >
            {loading ? "Processing…" : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
