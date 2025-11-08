// web/app/leads/admin/sources/SourceList.tsx
"use client";
import React, { useEffect, useState } from "react";
import SourceForm from "./SourceForm";

type Source = { id: string; tenant_id: string | null; key: string; name: string; config: any; created_at: string };

export default function SourceList() {
  const [items, setItems] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Source | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/sources?q=${encodeURIComponent(q)}`, { credentials: "include" });
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
        <input value={q} onChange={(e)=> setQ(e.target.value)} placeholder="Search sources..." className="p-2 rounded bg-slate-100 flex-1" />
        <button onClick={() => setShowCreate(true)} className="px-3 py-2 bg-blue-600 text-white rounded">Create</button>
      </div>

      <div className="space-y-2">
        {loading ? <div>Loading…</div> : null}
        {items.map(s => (
          <div key={s.id} className="flex items-center justify-between p-3 border rounded">
            <div>
              <div className="font-medium">{s.name}</div>
              <div className="text-sm text-muted">{s.key} • {s.tenant_id ?? "global"}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(s)} className="px-2 py-1 border rounded">Edit</button>
              <button onClick={async ()=> { if(!confirm("Delete source?")) return; await fetch(`/api/leads/sources/${s.id}`, { method: "DELETE", credentials: "include" }); load(); }} className="px-2 py-1 bg-red-600 text-white rounded">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showCreate && <SourceForm onClose={() => { setShowCreate(false); load(); }} />}
      {editing && <SourceForm source={editing} onClose={() => { setEditing(null); load(); }} />}
    </div>
  );
}
