// web/app/leads/admin/sources/SourceForm.tsx
"use client";
import React, { useState } from "react";

export default function SourceForm({ source, onClose }: { source?: any; onClose: () => void }) {
  const [key, setKey] = useState(source?.key ?? "");
  const [name, setName] = useState(source?.name ?? "");
  const [config, setConfig] = useState(JSON.stringify(source?.config ?? {}, null, 2));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const payload = { key, name, config: JSON.parse(config) };
      const url = source ? `/api/leads/sources/${source.id}` : `/api/leads/sources`;
      const method = source ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) {
        alert("Error: " + (j?.error ?? res.status));
        return;
      }
      onClose();
    } catch (e) {
      alert("Invalid JSON in config");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <div className="bg-white p-6 rounded w-[700px]">
        <h3 className="text-lg mb-3">{source ? "Edit Source" : "Create Source"}</h3>
        <label className="block text-sm mb-1">Key</label>
        <input value={key} onChange={(e)=> setKey(e.target.value)} className="w-full p-2 mb-3 border rounded" />
        <label className="block text-sm mb-1">Name</label>
        <input value={name} onChange={(e)=> setName(e.target.value)} className="w-full p-2 mb-3 border rounded" />
        <label className="block text-sm mb-1">Config (JSON)</label>
        <textarea value={config} onChange={(e)=> setConfig(e.target.value)} className="w-full h-36 p-2 mb-3 border rounded" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
          <button onClick={save} disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
