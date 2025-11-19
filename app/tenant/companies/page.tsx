"use client";

import React, { useEffect, useRef, useState } from "react";
import apiClient from "@/lib/api-client";
import axios from "axios";
import Link from "next/link";

type Company = { id: string; name: string; metadata?: Record<string, any> };

/** small helper: extract friendly message out of unknown */
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
    return (err as Error).message || `Request failed${resp?.status ? ` (${resp.status})` : ""}`;
  }
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err ?? "unknown error");
  }
}

/**
 * Compose an endpoint list in a non-hardcoded, env-driven way.
 * If NEXT_PUBLIC_API_BASE is set (e.g. https://api.example.com), we will
 * prefer absolute URLs from that base. Otherwise we use relative endpoints.
 */
function buildEndpoints(pathVariants: string[]) {
  const base = typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "") : "";
  // if base provided, prefer absolute URLs first (constructed safely)
  const absolute = base ? pathVariants.map((p) => `${base}${p.startsWith("/") ? p : "/" + p}`) : [];
  // always include relative variants (preserve order after absolute)
  return [...absolute, ...pathVariants];
}

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

  /**
   * Try endpoints (apiClient first, then fetch fallback if needed).
   * Endpoints are built by buildEndpoints so we never hardcode origins inside this file.
   */
  async function fetchCompanies() {
    setLoading(true);
    const controller = createController();

    // canonical path variants we support on backend
    const pathVariants = [
  `/admin/companies?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`,
  `/api/admin/companies?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`,
  `/companies?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`,
  `/api/companies?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`,
];


    const endpoints = buildEndpoints(pathVariants);

    try {
      let found: { url: string; data: any; status?: number } | null = null;

      // 1) Try using apiClient for each endpoint
      for (const url of endpoints) {
        try {
          // If apiClient has baseURL configured, passing an absolute URL will still work with axios.
          const resp = await apiClient.get(url, { withCredentials: true, signal: controller.signal as any });
          console.debug("apiClient GET", url, resp.status);
          if (resp?.status >= 200 && resp.status < 300) {
            found = { url, data: resp.data, status: resp.status };
            break;
          } else {
            console.debug("non-2xx from apiClient", url, resp.status, resp.data);
          }
        } catch (err: unknown) {
          // log and continue trying next endpoint
          console.debug("apiClient GET failed for", url, getErrorMessage(err));
        }
      }

      // 2) If apiClient didn't find a usable response, try fetch for the absolute endpoints
      if (!found) {
        for (const url of endpoints) {
          // only try absolute fetch for endpoints that look absolute, otherwise skip (avoid double-calls)
          const isAbsolute = /^https?:\/\//i.test(url);
          if (!isAbsolute) continue;
          try {
            const resp = await fetch(url, { credentials: "include", signal: controller.signal });
            const text = await resp.text().catch(() => "");
            let data: any = null;
            try {
              data = text ? JSON.parse(text) : null;
            } catch {
              data = text;
            }
            console.debug("fetch()", url, resp.status, data);
            if (resp.ok) {
              found = { url, data, status: resp.status };
              break;
            } else {
              console.debug("fetch non-ok", url, resp.status, data);
            }
          } catch (err: unknown) {
            console.debug("fetch failed for", url, getErrorMessage(err));
            // continue
          }
        }
      }

      // 3) Map response shapes into canonical items
      if (!found) {
        // last attempt: try relative fetchs in case server expects them (no absolute base configured)
        for (const url of endpoints.filter((u) => !/^https?:\/\//i.test(u))) {
          try {
            const resp = await fetch(url, { credentials: "include", signal: controller.signal });
            const text = await resp.text().catch(() => "");
            let data: any = null;
            try {
              data = text ? JSON.parse(text) : null;
            } catch {
              data = text;
            }
            if (resp.ok) {
              found = { url, data, status: resp.status };
              break;
            }
          } catch {
            // ignore and continue
          }
        }
      }

      if (!found) {
        console.warn("fetchCompanies: no endpoint returned usable data. Endpoints tried:", endpoints);
        setCompanies([]);
        setTotal(0);
        return;
      }

      // canonicalize body -> items array
      const body = found.data;
      const items: Company[] = Array.isArray(body)
        ? body
        : Array.isArray(body?.items)
        ? body.items
        : Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body?.companies)
        ? body.companies
        : [];

      const t: number =
        typeof body?.total === "number" ? body.total : items.length;

      setCompanies(items);
      setTotal(t);

      console.info("fetchCompanies success: used", found.url, "status", found.status, "items", items.length);
    } catch (err: unknown) {
      console.error("fetchCompanies error", getErrorMessage(err), err);
      setCompanies([]);
      setTotal(0);
    } finally {
      setLoading(false);
      controllers.current.delete(controller);
    }
  }

  // Manage = ask server to set session company then navigate (server authoritative)
  async function manageCompany(id: string) {
    if (!id) return;
    setLoading(true);
    try {
      // prefer calling the local switch endpoint (relative) unless NEXT_PUBLIC_API_BASE is set and you intend to call it absolutely
      const base = typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "") : "";
      const switchEndpoints = buildEndpoints(["/api/switch-company", "/switch-company"]);
      // try via apiClient
      let ok = false;
      for (const url of switchEndpoints) {
        try {
          const resp = await apiClient.post(url, { company_id: id }, { withCredentials: true });
          if (resp?.status >= 200 && resp.status < 300) {
            ok = true;
            break;
          }
        } catch (err: unknown) {
          // try next
          console.debug("manageCompany switch failed for", url, getErrorMessage(err));
        }
      }

      if (!ok) {
        throw new Error("switch endpoint failed");
      }

      // hard refresh to make sure server session is applied before settings page loads
      window.location.href = `/settings/companysettings?companyId=${encodeURIComponent(id)}`;
    } catch (err: unknown) {
      console.error("manageCompany failed", getErrorMessage(err), err);
      alert("Could not switch to company: " + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function saveCompany(id: string, payload: Partial<Company>) {
    if (!id) return;
    setLoading(true);
    const pathVariants = [
      `/tenant/companies/${id}`,
      `/api/tenant/companies/${id}`,
      `/admin/companies/${id}`,
      `/api/admin/companies/${id}`,
    ];
    const endpoints = buildEndpoints(pathVariants);

    const prev = companies;
    setCompanies((s) => s.map((c) => (c.id === id ? { ...c, ...(payload as any) } : c)));

    try {
      let saved = false;
      for (const url of endpoints) {
        try {
          const resp = await apiClient.put(url, payload, { withCredentials: true });
          if (resp?.status >= 200 && resp.status < 300) {
            saved = true;
            break;
          }
        } catch (err: unknown) {
          console.debug("saveCompany try failed for", url, getErrorMessage(err));
        }
      }
      if (!saved) throw new Error("no endpoint accepted update");
      setEditForm(null);
      setEditingId(null);
      alert("Saved");
    } catch (err: unknown) {
      console.error("saveCompany failed", getErrorMessage(err), err);
      setCompanies(prev);
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
