"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";

type Permission = {
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
  is_deprecated?: boolean | null;
};

export default function PermissionsPage() {
  const [items, setItems] = useState<Permission[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // form state (create/edit)
  const [form, setForm] = useState<Partial<Permission>>({});
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState<string>("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const r = await apiClient.get("/admin/permissions", { params: { q: search } });
      setItems(r.data?.items || r.data || []);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // initial
  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { load(); }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = useMemo(() => items, [items]);
  const total = filtered.length;

  function startCreate() {
    setEditingCode(null);
    setForm({ code: "", name: "", description: "", category: "", is_deprecated: false });
    setShowForm(true);
    setErr("");
  }

  function startEdit(p: Permission) {
    setEditingCode(p.code);
    setForm({ ...p });
    setShowForm(true);
    setErr("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      if (!form.code || !form.name) {
        setErr("Code and Name are required");
        return;
      }
      if (editingCode) {
        // update
        const payload: any = {
          name: form.name,
          description: form.description ?? null,
          category: form.category ?? null,
          is_deprecated: !!form.is_deprecated,
        };
        const r = await apiClient.put(`/admin/permissions/${editingCode}`, payload);
        setItems(prev => prev.map(it => it.code === editingCode ? r.data : it));
      } else {
        // create
        const payload: any = {
          code: String(form.code).trim(),
          name: form.name,
          description: form.description ?? null,
          category: form.category ?? null,
          is_deprecated: !!form.is_deprecated,
        };
        const r = await apiClient.post(`/admin/permissions`, payload);
        setItems(prev => [r.data, ...prev]);
      }
      setShowForm(false);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Save failed");
    }
  }

  async function onDelete(code: string) {
    if (!confirm(`Delete permission '${code}'? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/admin/permissions/${code}`);
      setItems(prev => prev.filter(it => it.code !== code));
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || "Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <input
          className="bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm flex-1"
          placeholder="Search permissions…"
          value={search}
          onChange={e=>setSearch(e.target.value)}
        />
        <button
          onClick={startCreate}
          className="px-3 py-2 rounded-lg text-sm border border-white/10 hover:bg-white/10 transition"
        >
          + New
        </button>
        <div className="text-sm opacity-70 min-w-[90px] text-right">
          {loading ? "Loading…" : `Total: ${total}`}
        </div>
      </div>

      {err && <div className="text-red-400 text-sm">{err}</div>}

      {/* Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Code</th>
              <th className="text-left px-3 py-2">Category</th>
              <th className="text-left px-3 py-2">Deprecated</th>
              <th className="text-left px-3 py-2">Description</th>
              <th className="text-right px-3 py-2 w-[140px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.code} className="border-t border-white/10">
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2">{p.code}</td>
                <td className="px-3 py-2">{p.category || <span className="opacity-40">—</span>}</td>
                <td className="px-3 py-2">
                  {p.is_deprecated ? <span className="text-yellow-400">Yes</span> : <span className="opacity-60">No</span>}
                </td>
                <td className="px-3 py-2 text-white/80">{p.description || <span className="opacity-40">—</span>}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button
                      className="px-2 py-1 rounded border border-white/10 hover:bg-white/10"
                      onClick={() => startEdit(p)}
                    >
                      Edit
                    </button>
                    <button
                      className="px-2 py-1 rounded border border-red-400/40 text-red-300 hover:bg-red-400/10"
                      onClick={() => onDelete(p.code)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && !loading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center opacity-60">No permissions found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Form Drawer/Modal (simple card) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0b0b0b] border border-white/10 rounded-xl w-full max-w-xl">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="font-medium">
                {editingCode ? `Edit Permission` : `Create Permission`}
              </div>
              <button className="opacity-70 hover:opacity-100" onClick={()=>setShowForm(false)}>✕</button>
            </div>

            <form onSubmit={onSubmit} className="p-4 space-y-3">
              {!editingCode && (
                <div>
                  <label className="block text-xs opacity-70 mb-1">Code</label>
                  <input
                    className="w-full bg-transparent border border-white/10 rounded px-3 py-2 text-sm"
                    placeholder="e.g. crm.leads.read"
                    value={form.code || ""}
                    onChange={e=>setForm(f => ({...f, code: e.target.value}))}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs opacity-70 mb-1">Name</label>
                <input
                  className="w-full bg-transparent border border-white/10 rounded px-3 py-2 text-sm"
                  placeholder="Human readable name"
                  value={form.name || ""}
                  onChange={e=>setForm(f => ({...f, name: e.target.value}))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs opacity-70 mb-1">Category</label>
                  <input
                    className="w-full bg-transparent border border-white/10 rounded px-3 py-2 text-sm"
                    placeholder="e.g. crm, iam, reports"
                    value={form.category || ""}
                    onChange={e=>setForm(f => ({...f, category: e.target.value}))}
                  />
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input
                    id="deprecated"
                    type="checkbox"
                    checked={!!form.is_deprecated}
                    onChange={e=>setForm(f => ({...f, is_deprecated: e.target.checked}))}
                  />
                  <label htmlFor="deprecated" className="text-sm">Deprecated</label>
                </div>
              </div>

              <div>
                <label className="block text-xs opacity-70 mb-1">Description</label>
                <textarea
                  className="w-full bg-transparent border border-white/10 rounded px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Short help text"
                  value={form.description || ""}
                  onChange={e=>setForm(f => ({...f, description: e.target.value}))}
                />
              </div>

              {err && <div className="text-red-400 text-sm">{err}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setShowForm(false)}
                        className="px-3 py-2 rounded border border-white/10">
                  Cancel
                </button>
                <button type="submit"
                        className="px-3 py-2 rounded border border-white/10 bg-white/10 hover:bg-white/20">
                  {editingCode ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
