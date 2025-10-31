"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

/* -------------------------------------------------------------------------- */
/*                              Component Props                               */
/* -------------------------------------------------------------------------- */
type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

/* -------------------------------------------------------------------------- */
/*                              Add Lead Drawer                               */
/* -------------------------------------------------------------------------- */
export default function AddLeadDrawer({ open, onClose, onCreated }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  });

  useEffect(() => setMounted(true), []);

  if (!mounted || !open) return null;

  /* -------------------------------------------------------------------------- */
  /*                              Handle Submit                                 */
  /* -------------------------------------------------------------------------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          primary_email: form.email,
          primary_phone: form.phone,
          meta: { company: form.company },
        }),
      });

      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error || "Failed to create lead");
        setSaving(false);
        return;
      }

      setSaving(false);
      setForm({ name: "", email: "", phone: "", company: "" });
      onCreated();
      onClose();
    } catch {
      setError("Network error");
      setSaving(false);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                             Drawer UI Portal                               */
  /* -------------------------------------------------------------------------- */
  const drawer = (
    <div className="fixed inset-0 z-[9999] flex">
      {/* Drawer Panel */}
      <div className="w-full sm:max-w-lg ml-auto h-full 
                      bg-gradient-to-b from-zinc-950/95 to-zinc-900/90 
                      backdrop-blur-xl border-l border-white/10 
                      p-6 overflow-y-auto shadow-[0_0_30px_rgba(255,255,255,0.1)]">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white/90">Add Lead</h3>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded-lg text-white/60 hover:text-white/90 hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-amber-300 text-sm bg-amber-300/10 px-3 py-2 rounded-lg border border-amber-400/20">
              {error}
            </div>
          )}

          <input
            type="text"
            className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-white/20"
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            required
          />

          <input
            type="email"
            className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-white/20"
            placeholder="Email Address"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
          />

          <input
            type="tel"
            className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-white/20"
            placeholder="Phone Number"
            value={form.phone}
            onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
          />

          <input
            type="text"
            className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-white/20"
            placeholder="Company Name"
            value={form.company}
            onChange={(e) => setForm((s) => ({ ...s, company: e.target.value }))}
          />

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>

            <button
              disabled={saving}
              type="submit"
              className="px-5 py-2 rounded-lg bg-white text-black font-semibold shadow hover:bg-white/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Create Lead"}
            </button>
          </div>
        </form>
      </div>

      {/* Background overlay */}
      <div
        className="flex-1 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
    </div>
  );

  return createPortal(drawer, document.body);
}
