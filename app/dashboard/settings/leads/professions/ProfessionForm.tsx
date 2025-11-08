// web/app/leads/admin/professions/ProfessionForm.tsx
"use client";
import React, { useState } from "react";

export default function ProfessionForm({ profession, onClose }: { profession?: any; onClose: () => void }) {
  const [name, setName] = useState(profession?.name ?? "");
  const [category, setCategory] = useState(profession?.category ?? "");
  const [description, setDescription] = useState(profession?.description ?? "");
  const [isActive, setIsActive] = useState(typeof profession?.is_active === "boolean" ? profession.is_active : true);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const payload = { name, category, description, is_active: isActive };
      const url = profession ? `/api/leads/professions/${profession.id}` : `/api/leads/professions`;
      const method = profession ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) {
        alert("Error: " + (j?.error ?? res.status));
        return;
      }
      onClose();
    } catch (e) {
      console.error(e);
      alert("Error saving profession");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <div className="bg-white p-6 rounded w-[700px]">
        <h3 className="text-lg mb-3">{profession ? "Edit Profession" : "Create Profession"}</h3>

        <label className="block text-sm mb-1">Name</label>
        <input value={name} onChange={(e)=> setName(e.target.value)} className="w-full p-2 mb-3 border rounded" />

        <label className="block text-sm mb-1">Category</label>
        <input value={category} onChange={(e)=> setCategory(e.target.value)} className="w-full p-2 mb-3 border rounded" />

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
