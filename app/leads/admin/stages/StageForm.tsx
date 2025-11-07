"use client";
import React, { useEffect, useState } from "react";

export default function StageForm({ pipelineId, stage, onClose }: { pipelineId?: string; stage?: any; onClose: () => void }) {
  const [pipelines, setPipelines] = useState<Array<{id:string;name:string}>>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>(stage?.pipeline_id ?? pipelineId ?? "");
  const [name, setName] = useState(stage?.name ?? "");
  const [order, setOrder] = useState(stage?.order ?? 1000);
  const [isWon, setIsWon] = useState(Boolean(stage?.is_won));
  const [isLost, setIsLost] = useState(Boolean(stage?.is_lost));
  const [isActive, setIsActive] = useState(typeof stage?.is_active === "boolean" ? stage.is_active : true);
  const [defaultProbability, setDefaultProbability] = useState(stage?.default_probability ?? 0);
  const [saving, setSaving] = useState(false);

  useEffect(()=> {
    (async () => {
      const res = await fetch(`/api/leads/pipelines`, { credentials: "include" });
      const j = await res.json();
      setPipelines(j.data ?? []);
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const payload = { pipeline_id: selectedPipeline, name, order, is_won: isWon, is_lost: isLost, is_active: isActive, default_probability: Number(defaultProbability) };
      const url = stage ? `/api/leads/stages/${stage.id}` : `/api/leads/stages`;
      const method = stage ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) { alert("Error: " + (j?.error ?? res.status)); return; }
      onClose();
    } catch (e) {
      console.error(e);
      alert("Error saving stage");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <div className="bg-white p-6 rounded w-[700px]">
        <h3 className="text-lg mb-3">{stage ? "Edit Stage" : "Create Stage"}</h3>

        <label className="block text-sm mb-1">Pipeline</label>
        <select value={selectedPipeline} onChange={(e)=> setSelectedPipeline(e.target.value)} className="w-full p-2 mb-3 border rounded">
          <option value="">Select pipeline...</option>
          {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <label className="block text-sm mb-1">Name</label>
        <input value={name} onChange={(e)=> setName(e.target.value)} className="w-full p-2 mb-3 border rounded" />

        <label className="block text-sm mb-1">Order (integer)</label>
        <input type="number" value={order} onChange={(e)=> setOrder(Number(e.target.value))} className="w-full p-2 mb-3 border rounded" />

        <label className="block text-sm mb-1">Default probability</label>
        <input type="number" step="0.01" value={defaultProbability} onChange={(e)=> setDefaultProbability(Number(e.target.value))} className="w-full p-2 mb-3 border rounded" />

        <label className="flex items-center gap-2 mb-2">
          <input type="checkbox" checked={isWon} onChange={(e)=> setIsWon(e.target.checked)} />
          <span>Is Won</span>
        </label>

        <label className="flex items-center gap-2 mb-2">
          <input type="checkbox" checked={isLost} onChange={(e)=> setIsLost(e.target.checked)} />
          <span>Is Lost</span>
        </label>

        <label className="flex items-center gap-2 mb-3">
          <input type="checkbox" checked={isActive} onChange={(e)=> setIsActive(e.target.checked)} />
          <span>Active</span>
        </label>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
          <button onClick={save} disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
