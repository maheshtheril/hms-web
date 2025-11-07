// web/app/leads/admin/industries/IndustryList.tsx
"use client";
import React, { useEffect, useState } from "react";
import IndustryForm from "./IndustryForm";

type Industry = {
  id: string;
  tenant_id: string | null;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
};

export default function IndustryList() {
  const [items, setItems] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Industry | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/industries?q=${encodeURIComponent(q)}`, {
        credentials: "include",
      });
      const j = await res.json();
      setItems(j.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [q]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search industries..."
          className="p-2 rounded bg-slate-100 flex-1"
        />
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-2 bg-blue-600 text-white rounded"
        >
          Create
        </button>
      </div>

      <div className="space-y-2">
        {loading ? <div>Loading…</div> : null}
        {items.map((i) => (
          <div
            key={i.id}
            className="flex items-center justify-between p-3 border rounded"
          >
            <div>
              <div className="font-medium">{i.name}</div>
              <div className="text-sm text-muted">
                {i.description ?? ""} • {i.tenant_id ?? "global"}
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <div className="text-sm">
                {i.is_active ? "Active" : "Inactive"}
              </div>
              <button
                onClick={() => setEditing(i)}
                className="px-2 py-1 border rounded"
              >
                Edit
              </button>
              <button
                onClick={async () => {
                  if (!confirm("Delete industry?")) return;
                  await fetch(`/api/leads/industries/${i.id}`, {
                    method: "DELETE",
                    credentials: "include",
                  });
                  load();
                }}
                className="px-2 py-1 bg-red-600 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <IndustryForm
          onClose={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
      {editing && (
        <IndustryForm
          industry={editing}
          onClose={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
