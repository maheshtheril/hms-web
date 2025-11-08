"use client";
import React, { useState } from "react";

export default function PipelineForm({ pipeline, onClose }: { pipeline?: any; onClose: () => void }) {
  const [name, setName] = useState(pipeline?.name ?? "");
  const [description, setDescription] = useState(pipeline?.description ?? "");
  const [isActive, setIsActive] = useState(typeof pipeline?.is_active === "boolean" ? pipeline.is_active : true);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const payload = { name, description, is_active: isActive };
      const url = pipeline ? `/api/leads/pipelines/${pipeline.id}` : `/api/leads/pipelines`;
      const method = pipeline ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) { alert("Error: " + (j?.error ?? res.status)); return; }
      onClose();
    } catch (e) {
      console.error(e);
      alert("Error saving pipeline");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <div className="bg-white p-6 rounded w-[700px]">
        <h3 className="text-lg mb-3">{pipeline ? "Edit Pipeline" : "Create Pipeline"}</h3>

        <label className="block text-sm mb-1">Name</label>
        <input value={name} onChange={(e)=> setName(e.target.value)} className="w-full p-2 mb-3 border rounded" />

        <label className="block text-sm mb-1">Description</label>
        <textarea value={description} onChange={(e)=> setDescription(e.target.value)} className="w-full p-2 mb-3 border rounded" />

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
