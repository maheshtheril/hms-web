"use client";

import React, { useEffect, useRef, useState } from "react";
import apiClient from "@/lib/api-client";
import axios from "axios";
import Link from "next/link";

type Company = { id: string; name: string; metadata?: Record<string, any> };

/** small helper: extract friendly message out of unknown */
function getErrorMessage(err: unknown) {
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

function buildEndpoints(pathVariants: string[]) {
  const base =
    typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "") : "";
  const absolute = base ? pathVariants.map((p) => `${base}${p.startsWith("/") ? p : "/" + p}`) : [];
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

  async function fetchCompanies() {
    setLoading(true);
    const controller = createController();

    const pathVariants = [
      `/admin/companies?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`,
      `/api/admin/companies?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`,
      `/companies?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`,
      `/api/companies?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`,
    ];

    const endpoints = buildEndpoints(pathVariants);

    try {
      let found: { url: string; data: any; status?: number } | null = null;

      for (const url of endpoints) {
        try {
          const resp = await apiClient.get(url, { withCredentials: true, signal: controller.signal as any });
          if (resp?.status >= 200 && resp.status < 300) {
            found = { url, data: resp.data, status: resp.status };
            break;
          }
        } catch (err: unknown) {
          console.debug("apiClient GET failed for", url, getErrorMessage(err));
        }
      }

      if (!found) {
        for (const url of endpoints) {
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
            if (resp.ok) {
              found = { url, data, status: resp.status };
              break;
            }
          } catch (err: unknown) {
            console.debug("fetch failed for", url, getErrorMessage(err));
          }
        }
      }

      if (!found) {
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

      const t: number = typeof body?.total === "number" ? body.total : items.length;

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

  async function manageCompany(id: string) {
    if (!id) return;
    setLoading(true);
    try {
      const switchEndpoints = buildEndpoints(["/api/switch-company", "/switch-company"]);
      let ok = false;
      for (const url of switchEndpoints) {
        try {
          const resp = await apiClient.post(url, { company_id: id }, { withCredentials: true });
          if (resp?.status >= 200 && resp.status < 300) {
            ok = true;
            break;
          }
        } catch (err: unknown) {
          console.debug("manageCompany switch failed for", url, getErrorMessage(err));
        }
      }

      if (!ok) {
        throw new Error("switch endpoint failed");
      }

      window.location.href = `/companysettings?companyId=${encodeURIComponent(id)}`;
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
    <div className="p-6 min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-3xl font-semibold leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-300 to-indigo-400">
              All Companies
            </span>
          </h1>
          <div className="flex items-center gap-3">
            <input
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Search companies..."
              aria-label="Search companies"
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/6 backdrop-blur-md placeholder-slate-300 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition"
            />
            <button
              onClick={() => {
                setQ("");
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/4 backdrop-blur-sm hover:scale-[1.02] transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="rounded-2xl p-6 shadow-2xl bg-white/6 backdrop-blur-md border border-white/10 ring-1 ring-white/5">
          <div className="overflow-x-auto rounded-lg">
            <table className="min-w-full text-sm divide-y border-collapse">
              <thead>
                <tr className="text-left">
                  <th className="p-3 text-slate-300">Name</th>
                  <th className="p-3 text-slate-400">ID</th>
                  <th className="p-3 text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {companies.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-slate-400">
                      No companies found.
                    </td>
                  </tr>
                ) : (
                  companies.map((c) => (
                    <tr key={c.id} className="transition hover:shadow-md hover:bg-white/8" style={{ borderRadius: 12 }}>
                      <td className="p-3">{c.name}</td>
                      <td className="p-3 text-xs text-slate-300">{c.id}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => void manageCompany(c.id)}
                            className="px-3 py-1 rounded-lg border border-white/12 bg-gradient-to-br from-white/4 to-white/6 backdrop-blur-sm text-sm hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-sky-400/30 transition"
                            aria-label={`Manage ${c.name}`}
                          >
                            Manage
                          </button>

                          {/* SETTINGS button: client friendly Link */}
                          <Link href={`/companysettings?companyId=${encodeURIComponent(c.id)}`}>
                            <button
                              type="button"
                              className="px-3 py-1 rounded-lg border border-white/12 bg-white/6 backdrop-blur-sm text-sm hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-400/30 transition"
                              aria-label={`Open settings for ${c.name}`}
                            >
                              Settings
                            </button>
                          </Link>

                          <button
                            onClick={() => {
                              setEditingId(c.id);
                              setEditForm({ ...c });
                            }}
                            className="px-3 py-1 rounded-lg border border-white/12 bg-white/4 backdrop-blur-sm text-sm hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-400/30 transition"
                            aria-label={`Edit ${c.name}`}
                          >
                            Edit
                          </button>
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
            <div className="text-sm text-slate-300">
              {total !== null ? `${Math.min((page - 1) * perPage + 1, total)} - ${Math.min(page * perPage, total)} of ${total}` : ""}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-3 py-1 rounded-xl border border-white/8 bg-white/4 focus:outline-none focus:ring-2 focus:ring-sky-400/20 disabled:opacity-50 transition"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={loading || (total !== null && page * perPage >= total)}
                className="px-3 py-1 rounded-xl border border-white/8 bg-white/4 focus:outline-none focus:ring-2 focus:ring-sky-400/20 disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          </div>

          {/* Inline edit */}
          {editForm && editingId && (
            <div className="mt-6 p-4 bg-white/6 backdrop-blur-md rounded-xl border border-white/10">
              <h3 className="font-medium mb-2 text-slate-100">Edit Company</h3>
              <input
                className="w-full px-3 py-2 rounded-lg border border-white/10 mb-3 bg-white/6 backdrop-blur-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 transition"
                value={editForm.name ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...(f ?? {}), name: e.target.value }))}
                aria-label="Company name"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => void saveCompany(editingId, editForm)}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500/90 to-indigo-500/90 text-white font-medium shadow-md hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition disabled:opacity-60"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setEditForm(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/4 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {loading && <p className="mt-4 text-center text-slate-300">Loading…</p>}
      </div>
    </div>
  );
}
