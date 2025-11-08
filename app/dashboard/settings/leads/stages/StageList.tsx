"use client";
import React, { useEffect, useState } from "react";
import StageForm from "./StageForm";

type Stage = { id: string; pipeline_id: string; tenant_id: string | null; name: string; order: number; is_won: boolean; is_lost: boolean; is_active: boolean; default_probability: number; created_at: string };

export default function StageList() {
  const [pipelineId, setPipelineId] = useState<string>("");
  const [pipelines, setPipelines] = useState<Array<{id:string; name:string}>>([]);
  const [items, setItems] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Stage | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function loadPipelines() {
    try {
      const res = await fetch(`/api/leads/pipelines`, { credentials: "include" });
      const j = await res.json();
      setPipelines((j.data ?? []).map((p:any)=>({ id: p.id, name: p.name })));
      if (!pipelineId && j.data?.length) setPipelineId(j.data[0].id);
    } catch (e) { console.error(e); }
  }

  async function loadStages(pid?: string) {
    const p = pid ?? pipelineId;
    if (!p) { setItems([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/stages?pipeline_id=${encodeURIComponent(p)}`, { credentials: "include" });
      const j = await res.json();
      setItems(j.data ?? []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(()=> { loadPipelines(); }, []);
  useEffect(()=> { loadStages(); }, [pipelineId]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <select value={pipelineId} onChange={(e)=> setPipelineId(e.target.value)} className="p-2 border rounded">
          <option value="">Select pipeline...</option>
          {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={() => setShowCreate(true)} className="px-3 py-2 bg-blue-600 text-white rounded">Create Stage</button>
        <button onClick={() => loadStages()} className="px-3 py-2 border rounded">Refresh</button>
      </div>

      {loading ? <div>Loading…</div> : null}
      <div className="space-y-2">
        {items.map(st => (
          <div key={st.id} className="flex items-center justify-between p-3 border rounded">
            <div>
              <div className="font-medium">{st.name}</div>
              <div className="text-sm text-muted">Order: {st.order} • Prob: {st.default_probability}</div>
            </div>
            <div className="flex gap-2 items-center">
              <div className="text-sm">{st.is_won ? "Won" : st.is_lost ? "Lost" : st.is_active ? "Active" : "Inactive"}</div>
              <button onClick={() => setEditing(st)} className="px-2 py-1 border rounded">Edit</button>
              <button onClick={async ()=> { if(!confirm("Delete stage?")) return; await fetch(`/api/leads/stages/${st.id}`, { method: "DELETE", credentials: "include" }); loadStages(); }} className="px-2 py-1 bg-red-600 text-white rounded">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showCreate && <StageForm pipelineId={pipelineId} onClose={() => { setShowCreate(false); loadStages(); }} />}
      {editing && <StageForm stage={editing} onClose={() => { setEditing(null); loadStages(); }} />}
    </div>
  );
}
