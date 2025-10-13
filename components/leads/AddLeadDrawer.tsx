"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function AddLeadDrawer() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await api("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          name,
          primary_email: email || null,
          primary_phone: phone || null,
          estimated_value: value ? Number(value) : 0,
        }),
      });
      setOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      setValue("");
      window.location.reload(); // refresh list after create
    } catch (err) {
      console.error("Add lead failed", err);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20"
        onClick={() => setOpen(true)}
      >
        + New Lead
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50">
      <div className="absolute right-0 top-0 h-full w-full sm:w-[400px] card rounded-none">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">New Lead</h2>
          <button
            className="px-2 py-1 bg-white/10 rounded-lg"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Phone</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Estimated Value</label>
            <input
              type="number"
              className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-semibold"
          >
            {loading ? "Saving…" : "Save Lead"}
          </button>
        </form>
      </div>
    </div>
  );
}
