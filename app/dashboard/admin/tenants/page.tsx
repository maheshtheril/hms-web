// app/dashboard/admin/tenants/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Tenant = {
  id: string;
  name: string;
  slug?: string | null;
  domain?: string | null;
  created_at: string;
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Tenant>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tenants", { credentials: "include" });
      const data = await res.json();
      setTenants(data.tenants ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => { setForm({ name: "", slug: "", domain: "" }); setCreating(true); };
  const startEdit = (t: Tenant) => { setForm({ name: t.name, slug: t.slug || "", domain: t.domain || "" }); setEditing(t); };

  const submitCreate = async () => {
    const res = await fetch("/api/admin/tenants", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.name, slug: form.slug || undefined, domain: form.domain || undefined }),
    });
    if (!res.ok) alert("Create failed");
    setCreating(false);
    await load();
  };

  const submitEdit = async () => {
    if (!editing) return;
    const res = await fetch(`/api/admin/tenants/${editing.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.name, slug: form.slug || undefined, domain: form.domain || undefined }),
    });
    if (!res.ok) alert("Update failed");
    setEditing(null);
    await load();
  };

  const confirmDelete = async (id: string) => {
    if (!confirm("Delete this tenant? This action can be reversed only by DB restore.")) return;
    const res = await fetch(`/api/admin/tenants/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) alert("Delete failed");
    await load();
  };

  return (
    <div className="pt-16 sm:pt-20">
      <div className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tenants</h1>
            <p className="mt-1 text-sm text-muted-foreground">Create, edit, and delete organizations.</p>
          </div>
          <button
            onClick={startCreate}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-muted"
          >
            + New Tenant
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {loading ? (
          <p className="text-foreground">Loading…</p>
        ) : tenants.length === 0 ? (
          <p className="text-muted-foreground">No tenants found.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Slug</th>
                  <th className="px-3 py-2 text-left">Domain</th>
                  <th className="px-3 py-2 text-left">Created</th>
                  <th className="px-3 py-2 text-left w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tenants.map(t => (
                  <tr key={t.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2">{t.name}</td>
                    <td className="px-3 py-2">{t.slug || "—"}</td>
                    <td className="px-3 py-2">{t.domain || "—"}</td>
                    <td className="px-3 py-2">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button className="rounded border px-2 py-1" onClick={() => startEdit(t)}>Edit</button>
                        <button className="rounded border px-2 py-1 hover:bg-red-600 hover:text-white" onClick={() => confirmDelete(t.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal (Create / Edit) */}
        {(creating || editing) && (
          <div className="fixed inset-0 z-30 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border bg-background p-6">
              <h2 className="text-lg font-semibold mb-4">{creating ? "New Tenant" : "Edit Tenant"}</h2>
              <div className="grid gap-4">
                <label className="grid gap-1">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <input
                    className="rounded border px-3 py-2 bg-transparent"
                    value={form.name || ""}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Acme Inc"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-muted-foreground">Slug</span>
                  <input
                    className="rounded border px-3 py-2 bg-transparent"
                    value={form.slug || ""}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                    placeholder="acme"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-muted-foreground">Domain</span>
                  <input
                    className="rounded border px-3 py-2 bg-transparent"
                    value={form.domain || ""}
                    onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
                    placeholder="acme.example.com"
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  className="rounded border px-3 py-2"
                  onClick={() => { setCreating(false); setEditing(null); }}
                >
                  Cancel
                </button>
                <button
                  className="rounded border px-3 py-2 hover:bg-primary hover:text-primary-foreground"
                  onClick={creating ? submitCreate : submitEdit}
                >
                  {creating ? "Create" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
