// app/leads/components/TaskComposer.tsx
"use client";
import React, { useState } from "react";
import { useToast } from "./useToast";

export default function TaskComposer({ leadId, onCreate }: any) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const toast = useToast();

  async function createTask() {
    if (!title.trim()) return;
    try {
      const res = await fetch("/api/lead-tasks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, title, due_date: due || undefined }),
      });
      const j = await res.json();
      onCreate(j.data);
      setTitle("");
      setDue("");
      toast.push({ title: "Task created" });
    } catch (err: any) {
      console.error("Create task", err);
      toast.push({ title: "Create failed", description: err?.message || "Failed" });
    }
  }

  return (
    <div className="flex gap-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" className="flex-1 bg-white/4 p-2 rounded-md text-white" />
      <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="bg-white/4 p-2 rounded-md text-white" />
      <button className="px-4 py-2 rounded-md bg-blue-600 text-white" onClick={createTask}>Create</button>
    </div>
  );
}
