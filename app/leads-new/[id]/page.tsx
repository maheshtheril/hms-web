"use client";
import { useEffect, useState } from "react";

export default function LeadDetails({ params }: any) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API}/api/new/leads/${params.id}`, { credentials: "include" })
      .then(r => r.json()).then(setData);
  }, [params.id]);

  if (!data) return <div className="p-8">Loading…</div>;
  const { lead, followups, notes, tasks } = data;
  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="glass p-4 rounded">
        <h1 className="text-2xl font-bold">{lead.name}</h1>
        <div>{lead.primary_email}</div>
        <div>{lead.primary_phone} ({lead.primary_phone_e164 || "no e164"})</div>
        <div>Status: {lead.status} | Priority: {lead.priority}</div>
      </div>
      <section className="glass p-4 rounded"><h2 className="font-semibold">Followups</h2>
        {followups.map((f: any) => <div key={f.id}>{f.due_at} — {f.note}</div>)}
      </section>
      <section className="glass p-4 rounded"><h2 className="font-semibold">Notes</h2>
        {notes.map((n: any) => <div key={n.id}>{n.body}</div>)}
      </section>
      <section className="glass p-4 rounded"><h2 className="font-semibold">Tasks</h2>
        {tasks.map((t: any) => <div key={t.id}>{t.title} — {t.status}</div>)}
      </section>
    </div>
  );
}
