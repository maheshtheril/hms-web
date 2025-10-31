// app/leads/components/LeadDetail.tsx
"use client";
import React, { useEffect, useState } from "react";
import NoteComposer from "./NoteComposer";
import TaskComposer from "./TaskComposer";
import FollowupComposer from "./FollowupComposer";

export default function LeadDetail({ leadId, onClose }: any) {
  const [lead, setLead] = useState<any | null>(null);
  const [tab, setTab] = useState<"timeline" | "notes" | "tasks" | "followups">("timeline");
  const [notes, setNotes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/leads/${leadId}`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/lead-notes/lead/${leadId}`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/lead-tasks/${leadId}`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/lead-followups/${leadId}`, { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([leadRes, notesRes, tasksRes, followupsRes]) => {
        setLead(leadRes.data || null);
        setNotes(notesRes.data || []);
        setTasks(tasksRes.data || []);
        setFollowups(followupsRes.data || []);
      })
      .catch((err) => console.error("LeadDetail load error", err))
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) {
    return <div className="bg-white/6 backdrop-blur-sm border border-white/6 rounded-2xl p-8">Loading...</div>;
  }

  return (
    <div className="bg-white/6 backdrop-blur-sm border border-white/6 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{lead?.name ?? "Lead"}</h2>
          <div className="text-white/70">{lead?.primary_email ?? lead?.primary_phone}</div>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-md bg-white/8 text-white" onClick={onClose}>Close</button>
        </div>
      </div>

      <nav className="mt-4 flex gap-2">
        {[
          ["timeline", "Timeline"],
          ["notes", "Notes"],
          ["tasks", "Tasks"],
          ["followups", "Follow-ups"],
        ].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k as any)} className={`px-3 py-1 rounded-full text-sm ${tab === k ? "bg-white/10" : "bg-white/4"}`}>
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-4">
        {tab === "notes" && (
          <div className="space-y-3">
            <NoteComposer leadId={leadId} onCreate={(n: any) => setNotes((s) => [n, ...s])} />
            {notes.map((n) => (
              <div key={n.id} className="p-3 bg-white/3 rounded-md">
                <div className="text-white/90">{n.body}</div>
                <div className="text-white/60 text-sm">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "tasks" && (
          <div className="space-y-3">
            <TaskComposer leadId={leadId} onCreate={(t: any) => setTasks((s) => [t, ...s])} />
            {tasks.map((t) => (
              <div key={t.id} className="p-3 bg-white/3 rounded-md flex justify-between items-center">
                <div>
                  <div className="text-white">{t.title}</div>
                  <div className="text-white/60 text-sm">Due: {t.due_date ?? "—"}</div>
                </div>
                <div>
                  {t.status !== "completed" ? (
                    <button className="px-3 py-1 rounded-md bg-white/8" onClick={async () => {
                      const res = await fetch(`/api/lead-tasks/${t.id}/complete`, { method: "POST", credentials: "include" });
                      const j = await res.json();
                      setTasks((s) => s.map((x) => (x.id === j.data.id ? j.data : x)));
                    }}>
                      Complete
                    </button>
                  ) : <span className="text-white/60">Done</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "followups" && (
          <div className="space-y-3">
            <FollowupComposer leadId={leadId} onCreate={(f: any) => setFollowups((s) => [f, ...s])} />
            {followups.map((f) => (
              <div key={f.id} className="p-3 bg-white/3 rounded-md flex justify-between">
                <div>
                  <div className="text-white">{f.note ?? "Follow-up"}</div>
                  <div className="text-white/60 text-sm">Due: {new Date(f.due_at).toLocaleString()}</div>
                </div>
                <div>
                  {f.status !== "done" ? (
                    <button className="px-3 py-1 rounded-md bg-white/8" onClick={async () => {
                      const res = await fetch(`/api/lead-followups/${f.id}/done`, { method: "POST", credentials: "include" });
                      const j = await res.json();
                      setFollowups((s) => s.map((x) => (x.id === j.data.id ? j.data : x)));
                    }}>
                      Mark done
                    </button>
                  ) : <span className="text-white/60">Done</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "timeline" && <div className="text-white/60">Timeline coming — aggregated activity feed.</div>}
      </div>
    </div>
  );
}
