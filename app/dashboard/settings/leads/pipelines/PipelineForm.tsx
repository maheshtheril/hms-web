"use client";
import React, { useEffect, useRef } from "react";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

/**
 * Controlled modal:
 * - open: boolean (controlled by parent)
 * - onClose: () => void  (called when user clicks overlay, presses Esc, or clicks Cancel)
 *
 * This implementation does NOT maintain its own "open" state.
 * It traps minimal keyboard (Escape) and restores focus to opener (best-effort).
 */

export default function PipelineForm({
  open,
  pipeline,
  onClose,
}: {
  open: boolean;
  pipeline?: any;
  onClose: () => void;
}) {
  const nameRef = useRef<HTMLInputElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // form state (local)
  const [name, setName] = React.useState(pipeline?.name ?? "");
  const [description, setDescription] = React.useState(pipeline?.description ?? "");
  const [isActive, setIsActive] = React.useState(pipeline?.is_active ?? true);
  const [saving, setSaving] = React.useState(false);

  // update local form values when pipeline changes or when opening
  useEffect(() => {
    setName(pipeline?.name ?? "");
    setDescription(pipeline?.description ?? "");
    setIsActive(pipeline?.is_active ?? true);
  }, [pipeline, open]);

  // focus first field when opened and remember opener to restore focus
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    // small timeout so element exists
    setTimeout(() => nameRef.current?.focus(), 50);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      try { openerRef.current?.focus(); } catch {}
    };
  }, [open, onClose]);

  async function save() {
    if (!name.trim()) {
      alert("Name is required");
      nameRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), description, is_active: isActive };
      const url = pipeline ? `/api/leads/pipelines/${pipeline.id}` : `/api/leads/pipelines`;
      const method = pipeline ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      onClose();
    } catch (err) {
      console.error("save pipeline error", err);
      alert("Failed to save pipeline");
    } finally {
      setSaving(false);
    }
  }

  // don't render anything if closed
  if (!open) return null;

  return (
    <>
      {/* overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md"
        onMouseDown={(e) => {
          // close if clicking the overlay (not when clicking inside modal)
          if (e.target === overlayRef.current) onClose();
        }}
        aria-hidden
      />

      {/* modal content */}
      <DialogContent
        className="fixed left-1/2 top-1/2 z-50 w-[420px] -translate-x-1/2 -translate-y-1/2 
          rounded-2xl border border-white/20 bg-white/30 dark:bg-slate-900/40 
          backdrop-blur-2xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 ring-1 ring-white/10"
        role="dialog"
        aria-modal="true"
        aria-label={pipeline ? "Edit Pipeline" : "Create Pipeline"}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-wide">
            {pipeline ? "Edit Pipeline" : "Create Pipeline"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label required>Name</Label>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/40 dark:bg-slate-800/40 
                px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              placeholder="Pipeline name"
              aria-required
            />
          </div>

          <div>
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/40 dark:bg-slate-800/40 
                px-3 py-2 min-h-[90px] text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              placeholder="Short description"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="accent-blue-500 w-4 h-4"
            />
            <span>Active</span>
          </label>
        </div>

        <DialogFooter className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium 
              bg-white/20 hover:bg-white/30 dark:bg-slate-800/30 dark:hover:bg-slate-700/40 
              border border-white/10 transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold 
              bg-gradient-to-r from-blue-500 to-blue-600 text-white 
              hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25 
              transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </>
  );
}
