// app/leads/components/NoteComposer.tsx
"use client";
import React, { useState } from "react";
import { useToast } from "./useToast";

export default function NoteComposer({ leadId, onCreate }: any) {
  const [body, setBody] = useState("");
  const toast = useToast();

  async function add() {
    if (!body.trim()) return;
    try {
      const res = await fetch("/api/lead-notes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, body, visibility: "internal" }),
      });
      const j = await res.json();
      onCreate(j.data);
      setBody("");
      toast.push({ title: "Note added" });
    } catch (err: any) {
      console.error("Add note", err);
      toast.push({ title: "Add failed", description: err?.message || "Failed" });
    }
  }

  return (
    <div className="flex gap-2">
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} className="flex-1 bg-white/4 text-white rounded-md p-2" placeholder="Write internal note..." />
      <button className="px-4 py-2 rounded-md bg-blue-600 text-white" onClick={add}>Add</button>
    </div>
  );
}
