// app/leads/components/CreateLeadInline.tsx
"use client";
import React, { useState } from "react";
import { useToast } from "./useToast";

export default function CreateLeadInline({ onCreate }: any) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const toast = useToast();

  async function create() {
    if (!name.trim()) return;
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, primary_email: email || undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw j;
      onCreate?.(j.data);
      setOpen(false);
      setName("");
      setEmail("");
      toast.push({ title: "Lead created", description: "Saved" });
    } catch (err: any) {
      console.error("Create lead", err);
      toast.push({ title: "Create failed", description: err?.message || "Failed" });
    }
  }

  if (!open)
    return <button className="px-3 py-2 rounded-md bg-green-600" onClick={() => setOpen(true)}>New</button>;

  return (
    <div className="flex gap-2 w-full">
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 bg-white/4 p-2 rounded-md text-white" />
      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-48 bg-white/4 p-2 rounded-md text-white" />
      <button className="px-3 py-2 rounded-md bg-blue-600" onClick={create}>Create</button>
      <button className="px-3 py-2 rounded-md bg-white/6 text-white" onClick={() => setOpen(false)}>Cancel</button>
    </div>
  );
}
