// path: app/dashboard/rbac/roles/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Permission, Role } from "@/lib/types";

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [perms, setPerms] = useState<Permission[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [err, setErr] = useState("");

  async function load() {
    const [r1, r2] = await Promise.all([
      apiClient.get("/admin/roles"),
      apiClient.get("/admin/permissions"),
    ]);
    setRoles(r1.data?.items || r1.data || []);
    setPerms(r2.data?.items || r2.data || []);
  }
  useEffect(() => { load().catch(()=>{}); }, []);

  const permissionsByCode = useMemo(() => {
    const map = new Map(perms.map(p => [p.code, p] as const));
    return map;
  }, [perms]);

  function startCreate() {
    setEditing({ id: "", name: "", code: "", description: "", permission_codes: [] });
    setOpen(true);
  }
  function startEdit(r: Role) { setEditing({ ...r, permission_codes: r.permission_codes || [] }); setOpen(true); }

  async function save() {
    if (!editing) return;
    setErr("");
    try {
      if (editing.id) {
        await apiClient.patch(`/admin/roles/${editing.id}`, editing);
      } else {
        const r = await apiClient.post(`/admin/roles`, editing);
        editing.id = r.data?.id || editing.id;
      }
      if (editing.id) {
        // sync permissions
        await apiClient.post(`/admin/roles/${editing.id}/permissions`, {
          permission_codes: editing.permission_codes || [],
        });
      }
      setOpen(false); setEditing(null); await load();
    } catch (e: any) { setErr(e?.response?.data?.message || e?.message || "Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="text-sm opacity-70">Define roles and attach permissions</div>
        <button onClick={startCreate} className="ml-auto rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/10">+ New Role</button>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Code</th>
              <th className="text-left px-3 py-2">Permissions</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(r => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.code}</td>
                <td className="px-3 py-2 text-white/80">
                  <div className="flex flex-wrap gap-1">
                    {(r.permission_codes||[]).map(c => (
                      <span key={c} className="text-[11px] rounded-full px-2 py-0.5 bg-white/10 border border-white/10">{permissionsByCode.get(c)?.name || c}</span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={()=>startEdit(r)} className="rounded-md border border-white/10 px-2 py-1 hover:bg-white/10">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={()=>setOpen(false)}>
          <div className="mx-auto mt-16 max-w-3xl rounded-2xl border border-white/10 bg-[#0b0b0b] p-4" onClick={e=>e.stopPropagation()}>
            <div className="text-sm font-semibold mb-2">{editing.id ? "Edit Role" : "New Role"}</div>
            {err && <div className="text-red-400 text-sm">{err}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <div className="text-xs text-white/60">Name</div>
                <input className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2" value={editing.name}
                       onChange={e=>setEditing({...editing, name: e.target.value})} />
              </label>
              <label className="space-y-1">
                <div className="text-xs text-white/60">Code</div>
                <input className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2" value={editing.code}
                       onChange={e=>setEditing({...editing, code: e.target.value.toLowerCase().replace(/\s+/g,'_')})} />
              </label>
              <label className="md:col-span-2 space-y-1">
                <div className="text-xs text-white/60">Description</div>
                <textarea className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2" rows={3}
                          value={editing.description||""} onChange={e=>setEditing({...editing, description: e.target.value})} />
              </label>
              <div className="md:col-span-2 space-y-1">
                <div className="text-xs text-white/60">Attach permissions</div>
                <div className="rounded-lg border border-white/10 p-3 max-h-80 overflow-auto grid md:grid-cols-2 gap-1.5">
                  {perms.map(p => {
                    const checked = (editing.permission_codes||[]).includes(p.code);
                    return (
                      <label key={p.code} className="flex items-center gap-2 text-sm py-1">
                        <input type="checkbox" checked={checked} onChange={e=>{
                          const set = new Set(editing.permission_codes||[]);
                          if (e.target.checked) set.add(p.code); else set.delete(p.code);
                          setEditing({ ...editing, permission_codes: Array.from(set) });
                        }} />
                        <span className="font-medium">{p.name}</span>
                        <span className="text-white/40">({p.code})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 justify-end">
              <button onClick={()=>setOpen(false)} className="rounded-lg border border-white/10 px-3 py-2 text-sm">Cancel</button>
              <button onClick={save} className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/10">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}