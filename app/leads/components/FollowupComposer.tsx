// app/leads/components/FollowupComposer.tsx
"use client";
import React, { useState } from "react";
import { useToast } from "./useToast";

export default function FollowupComposer({ leadId, onCreate }: any) {
  const [dueAt, setDueAt] = useState("");
  const [note, setNote] = useState("");
  const toast = useToast();

  async function createFollowup() {
    if (!dueAt) return;
    try {
      const res = await fetch("/api/lead-followups", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, due_at: new Date(dueAt).toISOString(), note }),
      });
      const j = await res.json();
      onCreate(j.data);
      setDueAt("");
      setNote("");
      toast.push({ title: "Follow-up created" });
    } catch (err: any) {
      console.error("Create followup", err);
      toast.push({ title: "Create failed", description: err?.message || "Failed" });
    }
  }

  return (
    <div className="flex gap-2">
      <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="bg-white/4 p-2 rounded-md text-white" />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" className="flex-1 bg-white/4 p-2 rounded-md text-white" />
      <button className="px-4 py-2 rounded-md bg-blue-600 text-white" onClick={createFollowup}>Create</button>
    </div>
  );
}
