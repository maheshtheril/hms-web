"use client";
// app/(settings)/companysettings/page.tsx

import apiClient from "@/lib/api-client";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";

type Company = { id: string; name: string };
type CompanySettings = {
  id?: string;
  company_id: string;
  default_currency_id?: string | null;
  fiscal_year_start?: string | null; // YYYY-MM-DD
  timezone?: string | null;
  metadata?: Record<string, any>;
};

type Tax = {
  id: string;
  name: string;
  code?: string;
  rate: number; // percent
  is_active: boolean;
  created_at?: string;
};

type Currency = { id: string; code: string; name: string; symbol?: string; precision: number };

/** Safe error message extractor */
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

/**
 * Build endpoints in an environment-driven way.
 * If NEXT_PUBLIC_API_BASE is set, prefer absolute URLs from that base; otherwise use relative paths.
 */
function buildEndpoints(pathVariants: string[]) {
  const base = typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "") : "";
  const absolute = base ? pathVariants.map((p) => `${base}${p.startsWith("/") ? p : "/" + p}`) : [];
  return [...absolute, ...pathVariants];
}

export default function CompanySettingsPage(): JSX.Element {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<string | "">("");
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "taxes" | "currencies">("general");

  const [taxForm, setTaxForm] = useState<Partial<Tax> | null>(null);
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);

  const controllers = useRef<Set<AbortController>>(new Set());

  useEffect(() => {
    void fetchSessionAndInit();
    void fetchCompanies();
    void fetchCurrencies();
    return () => {
      controllers.current.forEach((c) => {
        try {
          c.abort();
        } catch {}
      });
      controllers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (companyId) {
      void fetchCompanySettings(companyId);
      void fetchTaxes(companyId);
    } else {
      setSettings(null);
      setTaxes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  // --- Fetch helpers -------------------------------------------------
  async function tryFetchJson(url: string, opts?: RequestInit & { signal?: AbortSignal }) {
    const defaults: RequestInit = { credentials: "include", headers: { Accept: "application/json" } };
    const merged = Object.assign({}, defaults, opts || {});
    try {
      const res = await fetch(url, merged);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        const body = txt || `${res.status} ${res.statusText}`;
        const e: any = new Error(body);
        e.status = res.status;
        throw e;
      }
      const text = await res.text().catch(() => "");
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } catch (err: unknown) {
      throw err;
    }
  }

  async function fetchWithVariants<T = any>(endpoints: string[], opts?: RequestInit & { signal?: AbortSignal }) {
    for (const ep of endpoints) {
      try {
        const json = await tryFetchJson(ep, opts);
        if (!json) continue;
        return { json, url: ep } as { json: T; url: string };
      } catch (err: unknown) {
        if ((err as any)?.name === "AbortError") throw err;
        console.warn(`fetchWithVariants: ${ep} failed:`, getErrorMessage(err));
        continue;
      }
    }
    return null;
  }

  function createController() {
    const c = new AbortController();
    controllers.current.add(c);
    return c;
  }

  // --- Session / switch --------------------------------
  async function fetchSessionAndInit() {
    const controller = createController();
    try {
      setLoading(true);
      const endpoints = buildEndpoints(["/api/session", "/api/me", "/session"]);
      const found = await fetchWithVariants(endpoints, { signal: controller.signal });
      const json = found?.json ?? null;
      const sessionCompanyId = json?.company_id ?? json?.data?.company_id ?? "";
      if (sessionCompanyId) {
        setCompanyId(sessionCompanyId);
      }
    } catch (err: unknown) {
      if ((err as any)?.name === "AbortError") return;
      console.warn("fetchSessionAndInit: no session or failed", getErrorMessage(err));
    } finally {
      setLoading(false);
      controllers.current.delete(controller);
    }
  }

  async function switchCompany(nextCompanyId: string) {
    if (!nextCompanyId) {
      setCompanyId("");
      setSettings(null);
      setTaxes([]);
      return;
    }

    setCompanyId(nextCompanyId);
    const controller = createController();
    try {
      setLoading(true);
      // try switch endpoints in env-driven order
      const switchEndpoints = buildEndpoints(["/api/switch-company", "/switch-company"]);
      let switched = false;
      for (const url of switchEndpoints) {
        try {
          const resp = await apiClient.post(url, { company_id: nextCompanyId }, { withCredentials: true, signal: (controller.signal as any) });
          if (resp?.status >= 200 && resp.status < 300) {
            switched = true;
            break;
          }
        } catch (err: unknown) {
          console.warn("switchCompany try failed for", url, getErrorMessage(err));
        }
      }

      if (!switched) {
        console.warn("switchCompany: server returned non-2xx for all endpoints");
        setCompanyId("");
        setSettings(null);
        setTaxes([]);
        alert("Could not switch company (server rejected).");
        return;
      }

      await Promise.all([fetchCompanySettings(nextCompanyId), fetchTaxes(nextCompanyId)]);
      console.info("Switched company confirmed by server.");
    } catch (err: unknown) {
      if ((err as any)?.name === "AbortError") return;
      console.error("switchCompany failed:", getErrorMessage(err), err);
      setCompanyId("");
      setSettings(null);
      setTaxes([]);
      alert("Could not switch company: " + getErrorMessage(err));
    } finally {
      setLoading(false);
      controllers.current.delete(controller);
    }
  }

  // --- Fetchers --------------------------------------------------
  async function fetchCompanies() {
    // do NOT hardcode any origin here; endpoints are built from env or relative paths
    const pathVariants = [
      "/tenant/companies",
      "/api/tenant/companies",
      "/admin/companies",
      "/api/admin/companies",
      "/companies",
    ];

    const endpoints = buildEndpoints(pathVariants.map((p) => `${p}?page=1&perPage=500`)); // try retrieving ample page by default
    setLoading(true);
    const controller = createController();

    try {
      let found: { url: string; data: any } | null = null;

      // first try apiClient (which respects baseURL if configured)
      for (const url of endpoints) {
        try {
          const resp = await apiClient.get(url, { withCredentials: true, signal: controller.signal as any });
          if (resp?.status >= 200 && resp.status < 300) {
            found = { url, data: resp.data };
            break;
          }
        } catch (err: unknown) {
          console.warn("company variant failed", url, getErrorMessage(err));
          continue;
        }
      }

      // fallback: try relative fetch (useful when apiClient misconfigured)
      if (!found) {
        for (const url of endpoints.filter((u) => !/^https?:\/\//i.test(u))) {
          try {
            const json = await tryFetchJson(url, { signal: controller.signal });
            if (json) {
              found = { url, data: json };
              break;
            }
          } catch (err: unknown) {
            console.warn("relative fetch variant failed", url, getErrorMessage(err));
          }
        }
      }

      if (!found) {
        console.warn("fetchCompanies: no tenant/company endpoint found (checked endpoints).");
        setCompanies([]);
        return;
      }

      const data = found.data;
      let list: Company[] = [];
      if (Array.isArray(data)) list = data;
      else if (data?.ok && Array.isArray(data.data)) list = data.data;
      else if (Array.isArray(data.data)) list = data.data;
      else if (Array.isArray((data as any)?.companies)) list = (data as any).companies;
      else if (Array.isArray((data as any).items)) list = (data as any).items;
      if (!Array.isArray(list)) list = [];

      setCompanies(list);

      if (!companyId && list.length === 1) {
        void switchCompany(list[0].id);
      }

      console.info("Companies fetched via:", found.url);
    } catch (err: unknown) {
      console.error("fetchCompanies failed:", getErrorMessage(err), err);
      setCompanies([]);
    } finally {
      setLoading(false);
      controllers.current.delete(controller);
    }
  }

  async function fetchCompanySettings(cId: string) {
    if (!cId) return;
    const controller = createController();
    try {
      setLoading(true);
      const endpoints = buildEndpoints([
        `/api/global/company-settings?companyId=${encodeURIComponent(cId)}`,
        `/api/company-settings?companyId=${encodeURIComponent(cId)}`,
        `/api/company-settings/${encodeURIComponent(cId)}`,
      ]);
      const found = await fetchWithVariants(endpoints, { signal: controller.signal });
      const resJson = found?.json ?? null;
      const data = (resJson && (resJson.data ?? resJson)) || null;
      setSettings(data || { company_id: cId });
      if (found) console.info("Company settings fetched via:", found.url);
    } catch (err: unknown) {
      if ((err as any)?.name === "AbortError") return;
      console.error("fetchCompanySettings failed:", getErrorMessage(err), err);
    } finally {
      setLoading(false);
      controllers.current.delete(controller);
    }
  }

  async function fetchTaxes(cId: string) {
    if (!cId) {
      setTaxes([]);
      return;
    }
    const controller = createController();
    try {
      setLoading(true);
      const endpoints = buildEndpoints([
        `/api/global/company-taxes?companyId=${encodeURIComponent(cId)}`,
        `/api/company-taxes?companyId=${encodeURIComponent(cId)}`,
        `/api/company-taxes/${encodeURIComponent(cId)}`,
      ]);
      const found = await fetchWithVariants(endpoints, { signal: controller.signal });
      const resJson = found?.json ?? null;
      const data: Tax[] = (resJson && (resJson.data ?? resJson)) || [];
      setTaxes(Array.isArray(data) ? data : []);
      if (found) console.info("Taxes fetched via:", found.url);
    } catch (err: unknown) {
      if ((err as any)?.name === "AbortError") return;
      console.error("fetchTaxes failed:", getErrorMessage(err), err);
    } finally {
      setLoading(false);
      controllers.current.delete(controller);
    }
  }

  async function fetchCurrencies() {
    const endpoints = buildEndpoints(["/api/global/currencies", "/api/currencies", "/currencies"]);
    setLoading(true);
    const controller = createController();
    try {
      const found = await fetchWithVariants(endpoints, { signal: controller.signal });
      if (!found) {
        console.warn("fetchCurrencies: no currencies endpoint found, using fallback list.");
        setCurrencies([
          { id: "USD", code: "USD", name: "US Dollar", symbol: "$", precision: 2 },
          { id: "INR", code: "INR", name: "Indian Rupee", symbol: "₹", precision: 2 },
        ]);
        return;
      }

      const json = found.json;
      let list: Currency[] = [];
      if (Array.isArray(json)) list = json;
      else if (json?.ok && Array.isArray(json.data)) list = json.data;
      else if (Array.isArray(json.data)) list = json.data;
      if (!Array.isArray(list)) list = [];

      setCurrencies(list);
      console.info("Currencies fetched via:", found.url);
    } catch (err: unknown) {
      if ((err as any)?.name === "AbortError") return;
      console.error("fetchCurrencies failed:", getErrorMessage(err), err);
      setCurrencies([
        { id: "USD", code: "USD", name: "US Dollar", symbol: "$", precision: 2 },
        { id: "INR", code: "INR", name: "Indian Rupee", symbol: "₹", precision: 2 },
      ]);
    } finally {
      setLoading(false);
      controllers.current.delete(controller);
    }
  }

  // --- Save handlers (unchanged) --------------------------------------------
  async function saveSettings(payload: CompanySettings) {
    if (!payload?.company_id) return alert("Missing company id");
    const controller = createController();
    try {
      setLoading(true);
      const resJson = await tryFetchJson(`/api/global/company-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = (resJson && (resJson.data ?? resJson)) || null;
      setSettings(data || payload);
      alert("Settings saved");
    } catch (err: unknown) {
      if ((err as any)?.name === "AbortError") return;
      console.error(err);
      alert("Could not save settings: " + getErrorMessage(err));
    } finally {
      setLoading(false);
      controllers.current.delete(controller);
    }
  }

  async function createOrUpdateTax(payload: Partial<Tax>) {
    if (!companyId) return alert("Select a company first");
    const controller = createController();
    try {
      setLoading(true);
      if (editingTaxId) {
        const updatedJson = await tryFetchJson(`/api/global/company-taxes/${editingTaxId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const updated = (updatedJson && (updatedJson.data ?? updatedJson)) || updatedJson;
        setTaxes((s) => s.map((t) => (t.id === (updated?.id ?? editingTaxId) ? updated : t)));
        alert("Tax updated");
      } else {
        const createdJson = await tryFetchJson(`/api/global/company-taxes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...(payload || {}), company_id: companyId }),
          signal: controller.signal,
        });
        const created = (createdJson && (createdJson.data ?? createdJson)) || createdJson;
        if (created) setTaxes((s) => [created, ...s]);
        alert("Tax created");
      }
      setTaxForm(null);
      setEditingTaxId(null);
    } catch (err: unknown) {
      if ((err as any)?.name === "AbortError") return;
      console.error(err);
      alert("Could not save tax: " + getErrorMessage(err));
    } finally {
      setLoading(false);
      controllers.current.delete(controller);
    }
  }

  async function deleteTax(id: string) {
    if (!window.confirm("Delete this tax?")) return;
    const controller = createController();
    try {
      setLoading(true);
      await tryFetchJson(`/api/global/company-taxes/${id}`, { method: "DELETE", signal: controller.signal });
      setTaxes((s) => s.filter((t) => t.id !== id));
      alert("Deleted");
    } catch (err: unknown) {
      if ((err as any)?.name === "AbortError") return;
      console.error(err);
      alert("Could not delete tax: " + getErrorMessage(err));
    } finally {
      setLoading(false);
      controllers.current.delete(controller);
    }
  }

  // --- UI helpers & render (unchanged) ----------------------------------------------
  function openCreateTax() {
    setEditingTaxId(null);
    setTaxForm({ name: "", rate: 0, is_active: true });
    setActiveTab("taxes");
  }

  function openEditTax(t: Tax) {
    setEditingTaxId(t.id);
    setTaxForm({ ...t });
    setActiveTab("taxes");
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Company Settings</h1>
            <p className="text-sm text-slate-500 mt-1">Manage company-level settings — currencies, taxes, fiscal year.</p>
            {companies.length === 0 && (
              <p className="text-sm text-red-600 mt-2">No companies found — backend endpoints may be missing. Check server routes.</p>
            )}
          </div>

          <div className="flex gap-3 items-center">
            <select
              value={companyId}
              onChange={(e) => {
                const val = e.target.value;
                void switchCompany(val);
              }}
              className="px-3 py-2 rounded-lg bg-white/60 backdrop-blur-sm border border-slate-200"
              disabled={loading}
            >
              <option value="">— Select company —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              disabled={!companyId || loading}
              onClick={() => {
                if (companyId) {
                  void fetchCompanySettings(companyId);
                  void fetchTaxes(companyId);
                }
              }}
              className="px-3 py-2 rounded-lg border bg-white/60 backdrop-blur-sm disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Card */} 
        <div className="rounded-2xl p-6 shadow-lg bg-white/60 backdrop-blur-md border border-white/30">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <Tab label="General" active={activeTab === "general"} onClick={() => setActiveTab("general")} />
            <Tab label={`Taxes (${taxes.length})`} active={activeTab === "taxes"} onClick={() => setActiveTab("taxes")} />
            <Tab label={`Currencies`} active={activeTab === "currencies"} onClick={() => setActiveTab("currencies")} />
          </div>

          {/* Content */}
          <div>
            {activeTab === "general" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-700">Default Currency</label>
                  <select
                    className="w-full px-4 py-3 rounded-lg border bg-white"
                    value={settings?.default_currency_id ?? ""}
                    onChange={(e) => setSettings((s) => (s ? { ...s, default_currency_id: e.target.value || null } : null))}
                    disabled={!settings}
                  >
                    <option value="">— Select currency —</option>
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>

                  <label className="block text-sm font-medium text-slate-700">Fiscal Year Start</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-lg border bg-white"
                    value={settings?.fiscal_year_start ?? ""}
                    onChange={(e) => setSettings((s) => (s ? { ...s, fiscal_year_start: e.target.value || null } : null))}
                    disabled={!settings}
                  />

                  <label className="block text-sm font-medium text-slate-700">Timezone</label>
                  <input
                    type="text"
                    placeholder="e.g. Asia/Kolkata"
                    className="w-full px-4 py-3 rounded-lg border bg-white"
                    value={settings?.timezone ?? ""}
                    onChange={(e) => setSettings((s) => (s ? { ...s, timezone: e.target.value || null } : null))}
                    disabled={!settings}
                  />

                  <div className="pt-3">
                    <button
                      onClick={() => {
                        if (!settings || !companyId) return alert("No settings to save");
                        void saveSettings({ ...settings, company_id: companyId });
                      }}
                      className="px-4 py-2 rounded-lg bg-sky-600 text-white shadow-sm disabled:opacity-50"
                      disabled={!settings || loading}
                    >
                      Save General Settings
                    </button>
                  </div>
                </div>

                <div className="bg-white/40 rounded-lg p-4 border border-white/20">
                  <h3 className="font-medium">Quick facts</h3>
                  <p className="text-sm text-slate-600 mt-2">Default currency, fiscal year, timezone and other tenant-specific settings live here. Each company under a tenant can have different settings.</p>

                  <div className="mt-4">
                    <dl className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                      <div>
                        <dt className="text-xs text-slate-500">Company</dt>
                        <dd>{companies.find((c) => c.id === companyId)?.name ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Taxes</dt>
                        <dd>{taxes.length}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Currencies</dt>
                        <dd>{currencies.length}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Last updated</dt>
                        <dd>{settings?.id ? settings.id.slice(0, 8) : "—"}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            )}
            {/* taxes & currencies UI unchanged */}
            {activeTab === "taxes" && ( /* ... same as before */ ) }
            {activeTab === "currencies" && ( /* ... same as before */ ) }
          </div>
        </div>
      </div>
    </div>
  );
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium ${active ? "bg-white/90 shadow" : "bg-transparent border border-white/10"}`}
    >
      {label}
    </button>
  );
}
