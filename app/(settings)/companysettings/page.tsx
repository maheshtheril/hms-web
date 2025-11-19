"use client";

import React, { useEffect, useState } from "react";

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

  useEffect(() => {
    fetchCompanies();
    fetchCurrencies();
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
  async function tryFetchJson(url: string, opts?: RequestInit) {
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
      // try parse JSON, allow empty body
      const text = await res.text().catch(() => "");
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } catch (err) {
      throw err;
    }
  }

  // --- Fetchers -------------------------------------------------
  async function fetchCompanies() {
    // Prefer canonical endpoints; include tenant/admin variants as fallback
    const endpoints = ["/api/tenant/companies", "/api/admin/companies", "/api/companies"];
    setLoading(true);
    for (const ep of endpoints) {
      try {
        const json = await tryFetchJson(ep);
        let list: Company[] = [];
        if (!json) continue;
        if (Array.isArray(json)) list = json;
        else if (json?.ok && Array.isArray(json.data)) list = json.data;
        else if (Array.isArray(json.data)) list = json.data;
        if (list.length > 0) {
          setCompanies(list);
          if (!companyId) setCompanyId(list[0].id);
          setLoading(false);
          return;
        } else {
          setCompanies([]);
          setLoading(false);
          return;
        }
      } catch (err: any) {
        // try next endpoint on error (404/403 may happen depending on auth)
        console.warn(`fetchCompanies: ${ep} failed:`, err?.message || err);
        continue;
      }
    }
    console.warn("fetchCompanies: no tenant/company endpoint found. frontend will show empty list.");
    setCompanies([]);
    setLoading(false);
  }

  async function fetchCompanySettings(cId: string) {
    if (!cId) return;
    try {
      setLoading(true);
      // canonical endpoint
      const resJson = await tryFetchJson(`/api/global/company-settings?companyId=${encodeURIComponent(cId)}`, {
        method: "GET",
      });
      // normalize: either object or { data: {...} }
      const data = (resJson && (resJson.data ?? resJson)) || null;
      setSettings(data || { company_id: cId });
    } catch (err: any) {
      console.error(err);
      alert("Could not load company settings: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function fetchTaxes(cId: string) {
    if (!cId) return setTaxes([]);
    try {
      setLoading(true);
      // canonical company taxes endpoint
      const resJson = await tryFetchJson(`/api/global/company-taxes?companyId=${encodeURIComponent(cId)}`, {
        method: "GET",
      });
      const data: Tax[] = (resJson && (resJson.data ?? resJson)) || [];
      setTaxes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      alert("Could not load taxes: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function fetchCurrencies() {
    // Prefer global canonical endpoint first
    const endpoints = ["/api/global/currencies", "/api/currencies", "/api/currencies/"];
    setLoading(true);
    for (const ep of endpoints) {
      try {
        const json = await tryFetchJson(ep);
        if (!json) continue;
        let list: Currency[] = [];
        if (Array.isArray(json)) list = json;
        else if (json?.ok && Array.isArray(json.data)) list = json.data;
        else if (Array.isArray(json.data)) list = json.data;
        if (list.length > 0) {
          setCurrencies(list);
          setLoading(false);
          return;
        } else {
          setCurrencies([]);
          setLoading(false);
          return;
        }
      } catch (err: any) {
        console.warn(`fetchCurrencies: ${ep} failed:`, err?.message || err);
        continue;
      }
    }

    console.warn("fetchCurrencies: no currencies endpoint found, using fallback list.");
    setCurrencies([
      { id: "USD", code: "USD", name: "US Dollar", symbol: "$", precision: 2 },
      { id: "INR", code: "INR", name: "Indian Rupee", symbol: "₹", precision: 2 },
    ]);
    setLoading(false);
  }

  // --- Save handlers --------------------------------------------
  async function saveSettings(payload: CompanySettings) {
    if (!payload?.company_id) return alert("Missing company id");
    try {
      setLoading(true);
      // use canonical PUT endpoint and include credentials
      const resJson = await tryFetchJson(`/api/global/company-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (resJson && (resJson.data ?? resJson)) || null;
      setSettings(data || payload);
      alert("Settings saved");
    } catch (err: any) {
      console.error(err);
      alert("Could not save settings: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function createOrUpdateTax(payload: Partial<Tax>) {
    if (!companyId) return alert("Select a company first");
    try {
      setLoading(true);
      if (editingTaxId) {
        const updatedJson = await tryFetchJson(`/api/global/company-taxes/${editingTaxId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const updated = (updatedJson && (updatedJson.data ?? updatedJson)) || updatedJson;
        setTaxes((s) => s.map((t) => (t.id === updated.id ? updated : t)));
        alert("Tax updated");
      } else {
        const createdJson = await tryFetchJson(`/api/global/company-taxes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...(payload || {}), company_id: companyId }),
        });
        const created = (createdJson && (createdJson.data ?? createdJson)) || createdJson;
        setTaxes((s) => [created, ...s]);
        alert("Tax created");
      }
      setTaxForm(null);
      setEditingTaxId(null);
    } catch (err: any) {
      console.error(err);
      alert("Could not save tax: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function deleteTax(id: string) {
    if (!window.confirm("Delete this tax?")) return;
    try {
      setLoading(true);
      await tryFetchJson(`/api/global/company-taxes/${id}`, { method: "DELETE" });
      setTaxes((s) => s.filter((t) => t.id !== id));
      alert("Deleted");
    } catch (err: any) {
      console.error(err);
      alert("Could not delete tax: " + (err?.message || err));
    } finally {
      setLoading(false);
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
