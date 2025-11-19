import React, { useEffect, useState } from "react";

// CompanySettings_UI.tsx
// Single-file React component for the Company Settings page (Neural Glass Design Language)
// - Tailwind CSS utility classes are used
// - Default export is a React component ready to paste into web/app/(...) and preview
// - Wire the following endpoints in backend: GET /api/company/settings?companyId=..., PUT /api/company/settings
//   GET /api/company/taxes?companyId=..., POST /api/company/taxes, PUT /api/company/taxes/:id, DELETE /api/company/taxes/:id
//   GET /api/currencies

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

export default function CompanySettingsPage() {
  // App state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "taxes" | "currencies">("general");

  // local form state for editing/creating tax
  const [taxForm, setTaxForm] = useState<Partial<Tax> | null>(null);
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch tenant companies & currencies on mount
    fetchCompanies();
    fetchCurrencies();
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchCompanySettings(companyId);
      fetchTaxes(companyId);
    }
  }, [companyId]);

  // --- Fetchers -------------------------------------------------
  async function fetchCompanies() {
    try {
      setLoading(true);
      // Replace with your real tenant API
      const res = await fetch("/api/tenant/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      const data = await res.json();
      setCompanies(data || []);
      if ((data || []).length > 0 && !companyId) setCompanyId(data[0].id);
    } catch (err: any) {
      console.error(err);
      alert("Could not load companies: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function fetchCompanySettings(cId: string) {
    try {
      setLoading(true);
      const res = await fetch(`/api/company/settings?companyId=${encodeURIComponent(cId)}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSettings(data || { company_id: cId });
    } catch (err: any) {
      console.error(err);
      alert("Could not load company settings: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function fetchTaxes(cId: string) {
    try {
      setLoading(true);
      const res = await fetch(`/api/company/taxes?companyId=${encodeURIComponent(cId)}`);
      if (!res.ok) throw new Error("Failed to load taxes");
      const data = await res.json();
      setTaxes(data || []);
    } catch (err: any) {
      console.error(err);
      alert("Could not load taxes: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function fetchCurrencies() {
    try {
      const res = await fetch(`/api/currencies`);
      if (!res.ok) throw new Error("Failed to load currencies");
      const data = await res.json();
      setCurrencies(data || []);
    } catch (err: any) {
      console.error(err);
      alert("Could not load currencies: " + (err?.message || err));
    }
  }

  // --- Save handlers --------------------------------------------
  async function saveSettings(payload: CompanySettings) {
    try {
      setLoading(true);
      const res = await fetch(`/api/company/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSettings(data);
      alert("Settings saved");
    } catch (err: any) {
      console.error(err);
      alert("Could not save settings: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function createOrUpdateTax(payload: Partial<Tax>) {
    try {
      setLoading(true);
      if (editingTaxId) {
        const res = await fetch(`/api/company/taxes/${editingTaxId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated = await res.json();
        setTaxes((s) => s.map((t) => (t.id === updated.id ? updated : t)));
        alert("Tax updated");
      } else {
        const res = await fetch(`/api/company/taxes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, company_id: companyId }),
        });
        if (!res.ok) throw new Error(await res.text());
        const created = await res.json();
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
    if (!confirm("Delete this tax?")) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/company/taxes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
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
          </div>

          <div className="flex gap-3 items-center">
            <select
              value={companyId ?? ""}
              onChange={(e) => setCompanyId(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/60 backdrop-blur-sm border border-slate-200"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                // quick reload
                if (companyId) {
                  fetchCompanySettings(companyId);
                  fetchTaxes(companyId);
                }
              }}
              className="px-3 py-2 rounded-lg border bg-white/60 backdrop-blur-sm"
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
                    onChange={(e) => setSettings((s) => (s ? { ...s, default_currency_id: e.target.value } : null))}
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
                    onChange={(e) => setSettings((s) => (s ? { ...s, fiscal_year_start: e.target.value } : null))}
                  />

                  <label className="block text-sm font-medium text-slate-700">Timezone</label>
                  <input
                    type="text"
                    placeholder="e.g. Asia/Kolkata"
                    className="w-full px-4 py-3 rounded-lg border bg-white"
                    value={settings?.timezone ?? ""}
                    onChange={(e) => setSettings((s) => (s ? { ...s, timezone: e.target.value } : null))}
                  />

                  <div className="pt-3">
                    <button
                      onClick={() => {
                        if (!settings || !companyId) return alert("No settings to save");
                        saveSettings({ ...settings, company_id: companyId });
                      }}
                      className="px-4 py-2 rounded-lg bg-sky-600 text-white shadow-sm"
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
                        <dd>{settings?.id ? settings?.id.slice(0, 8) : "—"}</dd>
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
                    <button onClick={openCreateTax} className="px-3 py-2 rounded-lg bg-green-600 text-white">New Tax</button>
                    <button onClick={() => fetchTaxes(companyId!)} className="px-3 py-2 rounded-lg border">Reload</button>
                  </div>
                </div>

                {/* Tax form (create/edit) */}
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
                        onChange={(e) => setTaxForm((f) => ({ ...(f ?? {}), rate: Number(e.target.value) }))}
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
                          >
                            {editingTaxId ? "Update" : "Create"}
                          </button>
                          <button onClick={() => { setTaxForm(null); setEditingTaxId(null); }} className="ml-2 px-3 py-2 rounded-lg border">Cancel</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tax list */}
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
                      {taxes.map((t) => (
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "currencies" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Currencies</h3>
                  <button onClick={() => fetchCurrencies()} className="px-3 py-2 rounded-lg border">Reload</button>
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
                      {currencies.map((c) => (
                        <tr key={c.id} className="hover:bg-white/40">
                          <td className="p-2">{c.code}</td>
                          <td className="p-2">{c.name}</td>
                          <td className="p-2">{c.symbol}</td>
                          <td className="p-2">{c.precision}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-sm text-slate-500 mt-3">Currencies are global (tenant-wide). To add a currency, seed it in the admin DB (or call POST /api/currencies if you implement it).</p>
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
      className={`px-4 py-2 rounded-full text-sm font-medium ${
        active ? "bg-white/90 shadow" : "bg-transparent border border-white/10"
      }`}
    >
      {label}
    </button>
  );
}
