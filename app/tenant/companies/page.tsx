"use client";

import React, { useEffect, useRef, useState } from "react";
import apiClient from "@/lib/api-client";
import axios from "axios";
import Link from "next/link";

/** Safe error message extractor (same helper so file is standalone) */
function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const resp = (err as any).response;
    if (resp?.data) {
      if (typeof resp.data.message === "string") return resp.data.message;
      if (typeof resp.data.error === "string") return resp.data.error;
      if (typeof resp.data === "string") return resp.data;
      try {
        return JSON.stringify(resp.data);
      } catch {}
    }
    return err.message || `Request failed${resp?.status ? ` (${resp.status})` : ""}`;
  }
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    try {
      const e = err as Record<string, unknown>;
      if (typeof e.message === "string") return e.message;
      if (typeof e.error === "string") return e.error;
      return JSON.stringify(e);
    } catch {}
  }
  if (typeof err === "string") return err;
  return "An unknown error occurred";
}

type Company = { id: string; name: string; metadata?: Record<string, any> };

export default function AllCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [total, setTotal] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [editForm, setEditForm] = useState<Partial<Company> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const controllers = useRef<Set<AbortController>>(new Set());

  useEffect(() => {
    void fetchCompanies();
    return () => {
      controllers.current.forEach((c) => c.abort());
      controllers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q]);

  function createController() {
    const c = new AbortController();
    controllers.current.add(c);
    return c;
  }

  async function fetchCompanies() {
    setLoading(true);
    const controller = createController();
    // prefer explicit Render URL, then fallbacks — server should accept ?page & ?q
    const urls = [
      `https://hmsweb.onrender.com/tenant/companies?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`,
      `/tenant/companies?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`,
      `/api/tenant/companies?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`,
    ];
    try {
      let found: { url: string; data: any } | null = null;
      for (const url of urls) {
        try {
          const resp = await apiClient.get(url, { withCredentials: true, signal: controller.signal as any });
          if (resp?.status >= 200 && resp.status < 300) {
            found = { url, data: resp.data };
            break;
          }
        } catch (err: unknown) {
          // continue trying other endpoints
          if (axios.isAxiosError(err)) {
            continue;
          }
        }
      }
      if (!found) {
        setCompanies([]);
        setTotal(0);
        return;
      }
      const body = found.data;
      // canonical shape: { items: Company[], total: number }
      const items: Company[] = Array.isArray(body) ? body : body.items ?? body.data ?? [];
      const t: number = typeof body.total === "number" ? body.total : items.length;
      setCompanies(items);
      setTotal(t);
    } catch (err: unknown) {
      console.error("fetchCompanies error", getErrorMessage(err), err);
      setCompanies([]);
      setTotal(0);
    } finally {
      setLoading(false);
      controllers.current.delete(controller);
    }
  }

  // Manage = switch server session to this company and navigate to company settings
  async function manageCompany(id: string) {
    if (!id) return;
    setLoading(true);
    try {
      const resp = await apiClient.post(
        "/api/switch-company",
        { company_id: id },
        { withCredentials: true }
      );
      if (!(resp?.status >= 200 && resp.status < 300)) throw new Error("switch failed");
      // navigate to your settings page — server session now authoritative
      window.location.href = `/settings/companysettings?companyId=${encodeURIComponent(id)}`;
    } catch (err: unknown) {
      console.error("manageCompany failed", getErrorMessage(err), err);
      alert("Could not switch to company: " + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // optimistic edit
  async function saveCompany(id: string, payload: Partial<Company>) {
    if (!id) return;
    setLoading(true);
    // try canonical endpoint(s)
    const variants = [
      `https://hmsweb.onrender.com/tenant/companies/${id}`,
      `/tenant/companies/${id}`,
      `/api/tenant/companies/${id}`,
      `/admin/companies/${id}`,
      `/api/admin/companies/${id}`,
    ];
    // optimistic UI snapshot
    const prev = companies;
    setCompanies((s) => s.map((c) => (c.id === id ? { ...c, ...(payload as any) } : c)));
    try {
      let saved = false;
      for (const url of variants) {
        try {
          const resp = await apiClient.put(url, payload, { withCredentials: true });
          if (resp?.status >= 200 && resp.status < 300) {
            saved = true;
            break;
          }
        } catch (err: unknown) {
          // try next
          continue;
        }
      }
      if (!saved) throw new Error("no endpoint accepted update");
      setEditForm(null);
      setEditingId(null);
      alert("Saved");
    } catch (err: unknown) {
      console.error("saveCompany failed", getErrorMessage(err), err);
      setCompanies(prev); // revert
      alert("Save failed: " + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-semibold">All Companies</h1>
          <div className="flex items-center gap-3">
            <input
              value={q}
              onChange={(e) => { setPage(1); setQ(e.target.value); }}
              placeholder="Search companies..."
              className="px-3 py-2 rounded-lg border bg-white/80"
            />
            <button onClick={() => { setQ(""); setPage(1); }} className="px-3 py-2 rounded-lg border">Clear</button>
          </div>
        </div>

        <div className="rounded-2xl p-6 shadow-lg bg-white/60 backdrop-blur-md border border-white/30">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y">
              <thead>
                <tr className="text-left bg-white/70">
                  <th className="p-3">Name</th>
                  <th className="p-3">ID</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {companies.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-slate-500">No companies found.</td>
                  </tr>
                ) : (
                  companies.map((c) => (
                    <tr key={c.id} className="hover:bg-white/50">
                      <td className="p-3">{c.name}</td>
                      <td className="p-3 text-xs">{c.id}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button onClick={() => void manageCompany(c.id)} className="px-3 py-1 rounded border bg-white/60">Manage</button>
                          <button onClick={() => { setEditingId(c.id); setEditForm({ ...c }); }} className="px-3 py-1 rounded border bg-white/60">Edit</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              {total !== null ? `${Math.min((page-1)*perPage+1, total)} - ${Math.min(page*perPage, total)} of ${total}` : ""}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page === 1 || loading} className="px-3 py-1 rounded border">Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={loading || (total !== null && page*perPage >= total)} className="px-3 py-1 rounded border">Next</button>
            </div>
          </div>

          {/* Inline edit */}
          {editForm && editingId && (
            <div className="mt-6 p-4 bg-white rounded-lg border">
              <h3 className="font-medium mb-2">Edit Company</h3>
              <input className="w-full px-3 py-2 rounded border mb-3" value={editForm.name ?? ""} onChange={(e) => setEditForm((f) => ({ ...(f ?? {}), name: e.target.value }))} />
              <div className="flex gap-3">
                <button onClick={() => void saveCompany(editingId, editForm)} disabled={loading} className="px-4 py-2 rounded bg-sky-600 text-white">Save</button>
                <button onClick={() => { setEditingId(null); setEditForm(null); }} className="px-4 py-2 rounded border">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {loading && <p className="mt-4 text-center text-slate-600">Loading…</p>}
      </div>
    </div>
  );
}
