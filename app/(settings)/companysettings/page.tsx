"use client";

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

  // keep refs to abort controllers so we can cancel outstanding requests on unmount
  const controllers = useRef<Set<AbortController>>(new Set());

  useEffect(() => {
    // load base data on mount
    fetchCompanies();
    fetchCurrencies();
    // cleanup on unmount: abort outstanding requests
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
      fetchCompanySettings(companyId);
      fetchTaxes(companyId);
    } else {
      setSettings(null);
      setTaxes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  // --- Helpers -------------------------------------------------
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
    } catch (err: any) {
      // rethrow so callers can decide to continue to next endpoint
      throw err;
    }
  }

  // helper to try multiple endpoints with shared options (supports signal)
  async function fetchWithVariants<T = any>(endpoints: string[], opts?: RequestInit & { signal?: AbortSignal }) {
    for (const ep of endpoints) {
      try {
        const json = await tryFetchJson(ep, opts);
        if (!json) continue;
        return { json, url: ep } as { json: T; url: string };
      } catch (err: any) {
        // try next endpoint (log for debugging)
        // Ignore abort errors so they bubble to caller
        if (err?.name === "AbortError") throw err;
        console.warn(`fetchWithVariants: ${ep} failed:`, err?.message ?? err);
        continue;
      }
    }
    return null;
  }

  // small utility to create & track AbortController for each request
  function createController() {
    const c = new AbortController();
    controllers.current.add(c);
    return c;
  }

  // --- Fetchers -------------------------------------------------
  async function fetchCompanies() {
    const endpoints = [
      "/admin/companies",
      "/tenant/companies",
      "/api/admin/companies",
      "/api/companies",
      "/companies",
    ];
    setLoading(true);
    const controller = createController();
    try {
      const found = await fetchWithVariants(endpoints, { signal: controller.signal });
      if (!found) {
        console.warn("fetchCompanies: no tenant/company endpoint found.");
        setCompanies([]);
        return;
      }

      const data = found.json;
      let list: Company[] = [];
      if (Array.isArray(data)) list = data;
      else if (data?.ok && Array.isArray(data.data)) list = data.data;
      else if (Array.isArray(data.data)) list = data.data;
      else if (Array.isArray((data as any)?.companies)) list = (data as any).companies;
      else if (Array.isArray((data as any).items)) list = (data as any).items;

      if (!Array.isArray(list)) list = [];

      setCompanies(list);

      // Only auto-select if no selection exists AND there is exactly one company.
      // If caller or routing already set companyId, respect it.
      if (!companyId && list.length === 1) {
        setCompanyId(list[0].id);
      }
      console.info("Companies fetched via:", found.url);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // aborted; ignore
        return;
      }
      console.error("fetchCompanies failed:", err);
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
      // prefer canonical /api/global/company-settings but try a fallback as well
      const endpoints = [
        `/api/global/company-settings?companyId=${encodeURIComponent(cId)}`,
        `/api/company-settings?companyId=${encodeURIComponent(cId)}`,
        `/api/company-settings/${encodeURIComponent(cId)}`,
      ];
      const found = await fetchWithVariants(endpoints, { signal: controller.signal });
      const resJson = found?.json ?? null;
      const data = (resJson && (resJson.data ?? resJson)) || null;
      setSettings(data || { company_id: cId });
      if (found) console.info("Company settings fetched via:", found.url);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("fetchCompanySettings failed:", err);
      alert("Could not load company settings: " + (err?.message || err));
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
      const endpoints = [
        `/api/global/company-taxes?companyId=${encodeURIComponent(cId)}`,
        `/api/company-taxes?companyId=${encodeURIComponent(cId)}`,
        `/api/company-taxes/${encodeURIComponent(cId)}`,
      ];
      const found = await fetchWithVariants(endpoints, { signal: controller.signal });
      const resJson = found?.json ?? null;
      const data: Tax[] = (resJson && (resJson.data ?? resJson)) || [];
      setTaxes(Array.isArray(data) ? data : []);
      if (found) console.info("Taxes fetched via:", found.url);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("fetchTaxes failed:", err);
      alert("Could not load taxes: " + (err?.message || err));
    } finally {
      setLoading(false);
      controllers.current.delete(controller);
    }
  }

  async function fetchCurrencies() {
    const endpoints = ["/api/global/currencies", "/api/currencies", "/api/currencies/", "/currencies"];
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
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("fetchCurrencies failed:", err);
      setCurrencies([
        { id: "USD", code: "USD", name: "US Dollar", symbol: "$", precision: 2 },
        { id: "INR", code: "INR", name: "Indian Rupee", symbol: "₹", precision: 2 },
      ]);
    } finally {
      setLoading(false);
      controllers.current.delete(controller);
    }
  }

  // --- Save handlers --------------------------------------------
  async function saveSettings(payload: CompanySettings) {
    if (!payload?.company_id) return alert("Missing company id");
    const controller = createController();
    try {
      setLoading(true);
      // use canonical PUT endpoint and include credentials
      const resJson = await tryFetchJson(`/api/global/company-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = (resJson && (resJson.data ?? resJson)) || null;
      setSettings(data || payload);
      alert("Settings saved");
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error(err);
      alert("Could not save settings: " + (err?.message || err));
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
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error(err);
      alert("Could not save tax: " + (err?.message || err));
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
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error(err);
      alert("Could not delete tax: " + (err?.message || err));
    } finally {
      setLoading(false);
      controllers.current.delete(controller);
    }
  }

  // --- UI helpers ----------------------------------------------
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

  // --- Render --------------------------------------------------
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
              onChange={(e) => setCompanyId(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/60 backdrop-blur-sm border border-slate-200"
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
                  fetchCompanySettings(companyId);
                  fetchTaxes(companyId);
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
                        saveSettings({ ...settings, company_id: companyId });
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

            {activeTab === "taxes" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Taxes</h3>
                  <div className="flex gap-2">
                    <button onClick={openCreateTax} className="px-3 py-2 rounded-lg bg-green-600 text-white" disabled={!companyId || loading}>
                      New Tax
                    </button>
                    <button onClick={() => fetchTaxes(companyId || "")} className="px-3 py-2 rounded-lg border" disabled={!companyId || loading}>
                      Reload
                    </button>
                  </div>
                </div>

                {taxForm && (
                  <div className="p-4 rounded-lg bg-white/80 border mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        placeholder="Tax name"
                        className="px-3 py-2 rounded-lg border"
                        value={String(taxForm.name ?? "")}
                        onChange={(e) => setTaxForm((f) => ({ ...(f ?? {}), name: e.target.value }))}
                      />
                      <input
                        type="number"
                        placeholder="Rate (%)"
                        className="px-3 py-2 rounded-lg border"
                        value={String(taxForm.rate ?? 0)}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setTaxForm((f) => ({ ...(f ?? {}), rate: Number.isFinite(v) ? v : 0 }));
                        }}
                      />
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(taxForm.is_active)}
                            onChange={(e) => setTaxForm((f) => ({ ...(f ?? {}), is_active: e.target.checked }))}
                          />
                          Active
                        </label>
                        <div className="ml-auto">
                          <button
                            onClick={() => {
                              if (!taxForm?.name) return alert("Name required");
                              if (taxForm.rate == null) return alert("Rate required");
                              createOrUpdateTax(taxForm as Partial<Tax>);
                            }}
                            className="px-3 py-2 rounded-lg bg-sky-600 text-white"
                            disabled={loading}
                          >
                            {editingTaxId ? "Update" : "Create"}
                          </button>
                          <button onClick={() => { setTaxForm(null); setEditingTaxId(null); }} className="ml-2 px-3 py-2 rounded-lg border">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm divide-y">
                    <thead>
                      <tr className="text-left">
                        <th className="p-2">Name</th>
                        <th className="p-2">Rate</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {taxes.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-sm text-slate-500">No taxes defined.</td>
                        </tr>
                      ) : (
                        taxes.map((t) => (
                          <tr key={t.id} className="hover:bg-white/40">
                            <td className="p-2">{t.name}</td>
                            <td className="p-2">{t.rate}%</td>
                            <td className="p-2">{t.is_active ? "Active" : "Inactive"}</td>
                            <td className="p-2">
                              <div className="flex gap-2">
                                <button onClick={() => openEditTax(t)} className="px-2 py-1 rounded border">Edit</button>
                                <button onClick={() => deleteTax(t.id)} className="px-2 py-1 rounded border text-red-600">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "currencies" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Currencies</h3>
                  <button onClick={() => fetchCurrencies()} className="px-3 py-2 rounded-lg border" disabled={loading}>
                    Reload
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm divide-y">
                    <thead>
                      <tr className="text-left">
                        <th className="p-2">Code</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Symbol</th>
                        <th className="p-2">Precision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {currencies.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-sm text-slate-500">No currencies available.</td>
                        </tr>
                      ) : (
                        currencies.map((c) => (
                          <tr key={c.id} className="hover:bg-white/40">
                            <td className="p-2">{c.code}</td>
                            <td className="p-2">{c.name}</td>
                            <td className="p-2">{c.symbol ?? "—"}</td>
                            <td className="p-2">{c.precision}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="text-sm text-slate-500 mt-3">Currencies are global (tenant-wide). To add a currency, seed it in the admin DB (or implement a POST /api/currencies).</p>
              </div>
            )}
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
