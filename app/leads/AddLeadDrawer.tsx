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

  // ensure portal only renders on client
  useEffect(() => setMounted(true), []);

  if (!mounted || !open) return null;

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
          primary_email: form.email || null,
          primary_phone: form.phone || null,
          meta: { company: form.company || null },
        }),
        cache: "no-store",
      });

      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error || "Failed to create lead");
        setSaving(false);
        return;
      }

      // success
      setSaving(false);
      setForm({ name: "", email: "", phone: "", company: "" });
      onCreated();
      onClose();
    } catch (err) {
      setError("Network error");
      setSaving(false);
    }
  }

  const drawer = (
    <div className="fixed inset-0 z-[99999] flex">
      {/* Panel */}
      <div
        className={
          "w-full sm:max-w-lg ml-auto h-full " +
          "bg-gradient-to-b from-zinc-950/95 to-zinc-900/90 backdrop-blur-xl " +
          "border-l border-white/10 p-6 overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
        }
        role="dialog"
        aria-modal="true"
        aria-label="Add Lead"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white/90">Add Lead</h3>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="px-2 py-1 rounded-lg text-white/60 hover:text-white/90 hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-amber-300 text-sm bg-amber-300/8 px-3 py-2 rounded-lg border border-amber-400/20">
              {error}
            </div>
          )}

          <input
            type="text"
            className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-white/20"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            required
          />

          <input
            type="email"
            className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-white/20"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
          />

          <input
            type="tel"
            className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-white/20"
            placeholder="Phone number"
            value={form.phone}
            onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
          />

          <input
            type="text"
            className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-white/20"
            placeholder="Company (optional)"
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

      {/* Overlay */}
      <div
        className="flex-1 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
    </div>
  );

  return createPortal(drawer, document.body);
}
