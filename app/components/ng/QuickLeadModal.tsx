"use client";

import { useState } from "react";

export default function QuickLeadModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Call API to save lead
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: (e.target as any).name.value,
          email: (e.target as any).email.value,
          phone: (e.target as any).phone.value,
          source: (e.target as any).source.value,
          notes: (e.target as any).notes.value,
        }),
      });
      alert("Lead saved successfully!");
      setOpen(false);
    } catch {
      alert("Error saving lead.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-md cursor-pointer bg-gradient-to-r from-sky-500 to-indigo-500 hover:opacity-90 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" />
        </svg>
        Quick Lead
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/95 p-6 shadow-xl text-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add Quick Lead</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                required
                type="text"
                name="name"
                placeholder="Full Name"
                className="w-full rounded-md bg-zinc-800 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500"
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                className="w-full rounded-md bg-zinc-800 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500"
              />
              <input
                type="tel"
                name="phone"
                placeholder="Phone"
                className="w-full rounded-md bg-zinc-800 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500"
              />
              <input
                type="text"
                name="source"
                placeholder="Source (e.g., Website, Campaign)"
                className="w-full rounded-md bg-zinc-800 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500"
              />
              <textarea
                name="notes"
                placeholder="Notes"
                className="w-full rounded-md bg-zinc-800 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500"
              />

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-white/10 px-4 py-2 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 font-semibold text-black hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
