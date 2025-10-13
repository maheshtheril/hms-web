"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export default function AddLeadDrawer({ open, onClose, onCreated }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        cache: "no-store",
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error || "Failed to create lead");
        setSaving(false);
        return;
      }
      onCreated();
    } catch {
      setError("Network error");
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="w-full sm:max-w-lg ml-auto h-full bg-zinc-900/95 backdrop-blur border-l border-white/10 p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Lead</h3>
          <button onClick={onClose} className="px-2 py-1 rounded-lg hover:bg-white/10">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="text-amber-300 text-sm">{error}</div>}
          <input className="w-full rounded-lg bg-white/5 px-3 py-2" placeholder="Name"
                 value={form.name} onChange={e=>setForm(s=>({...s,name:e.target.value}))} required />
          <input className="w-full rounded-lg bg-white/5 px-3 py-2" placeholder="Email"
                 value={form.email} onChange={e=>setForm(s=>({...s,email:e.target.value}))} />
          <input className="w-full rounded-lg bg-white/5 px-3 py-2" placeholder="Phone"
                 value={form.phone} onChange={e=>setForm(s=>({...s,phone:e.target.value}))} />
          <input className="w-full rounded-lg bg-white/5 px-3 py-2" placeholder="Company"
                 value={form.company} onChange={e=>setForm(s=>({...s,company:e.target.value}))} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10">Cancel</button>
            <button disabled={saving} className="px-4 py-2 rounded-lg bg-white text-black font-semibold">
              {saving ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      </div>
      <div className="flex-1 bg-black/40" onClick={onClose} />
    </div>
  );
}
