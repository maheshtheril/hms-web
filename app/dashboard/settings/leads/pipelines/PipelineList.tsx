"use client";
import React, { useEffect, useState } from "react";
import PipelineForm from "./PipelineForm";

type Pipeline = { id: string; tenant_id: string | null; name: string; description?: string; is_active: boolean; created_at: string };

export default function PipelineList() {
  const [items, setItems] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Pipeline | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/pipelines?q=${encodeURIComponent(q)}`, { credentials: "include" });
      const j = await res.json();
      setItems(j.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [q]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input value={q} onChange={(e)=> setQ(e.target.value)} placeholder="Search pipelines..." className="p-2 rounded bg-slate-100 flex-1" />
        <button onClick={() => setShowCreate(true)} className="px-3 py-2 bg-blue-600 text-white rounded">Create</button>
      </div>

      <div className="space-y-2">
        {loading ? <div>Loading…</div> : null}
        {items.map(p => (
          <div key={p.id} className="flex items-center justify-between p-3 border rounded">
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-muted">{p.description ?? ""} • {p.tenant_id ?? "global"}</div>
            </div>
            <div className="flex gap-2 items-center">
              <div className="text-sm">{p.is_active ? "Active" : "Inactive"}</div>
              <button onClick={() => setEditing(p)} className="px-2 py-1 border rounded">Edit</button>
              <button onClick={async ()=> { if(!confirm("Delete pipeline? This will delete its stages.")) return; await fetch(`/api/leads/pipelines/${p.id}`, { method: "DELETE", credentials: "include" }); load(); }} className="px-2 py-1 bg-red-600 text-white rounded">Delete</button>
              <a href={`/leads/admin/stages?pipeline_id=${p.id}`} className="px-2 py-1 border rounded text-sm">Manage Stages</a>
            </div>
          </div>
        ))}
      </div>

      {showCreate && <PipelineForm onClose={() => { setShowCreate(false); load(); }} />}
      {editing && <PipelineForm pipeline={editing} onClose={() => { setEditing(null); load(); }} />}
    </div>
  );
}
