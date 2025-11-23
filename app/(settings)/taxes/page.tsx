"use client";

import React, { useEffect, useState } from "react";

// Types
type Company = { id: string; name: string };
type GlobalTaxType = { id: string; name: string; code?: string; description?: string };
type GlobalTaxRate = { id: string; tax_type_id: string; rate: number; name: string };

// Your company-level applied taxes
type CompanyTax = {
  id: string;
  company_id: string;
  tax_type_id: string;
  tax_rate_id: string;
  is_active: boolean;
};

// Combined enriched view for UI
type NormalizedCompanyTax = CompanyTax & {
  tax_type?: GlobalTaxType | null;
  tax_rate?: GlobalTaxRate | null;
};

export default function TaxSettingsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [taxTypes, setTaxTypes] = useState<GlobalTaxType[]>([]);
  const [taxRates, setTaxRates] = useState<GlobalTaxRate[]>([]);

  const [companyTaxes, setCompanyTaxes] = useState<NormalizedCompanyTax[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch everything
  useEffect(() => {
    (async () => {
      try {
        const [cRes, tRes, rRes] = await Promise.all([
          fetch("/api/companies"),
          fetch("/api/global-taxes/types"),
          fetch("/api/global-taxes/rates"),
        ]);

        const companiesData = (await cRes.json()) || [];
        const taxTypesData = (await tRes.json()) || [];
        const taxRatesData = (await rRes.json()) || [];

        setCompanies(Array.isArray(companiesData) ? companiesData : []);
        setTaxTypes(Array.isArray(taxTypesData) ? taxTypesData : []);
        setTaxRates(Array.isArray(taxRatesData) ? taxRatesData : []);

        // default company
        if (companiesData?.[0]?.id) {
          loadCompanyTaxes(companiesData[0].id);
        }
      } catch (e) {
        console.error("Failed loading tax settings", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load company-specific tax config
  async function loadCompanyTaxes(company_id: string) {
    setSelectedCompany(company_id);

    try {
      const res = await fetch(`/api/companies/${company_id}/taxes`);
      const rawTaxes: CompanyTax[] = (await res.json()) || [];

      const enriched = rawTaxes.map((ct) => ({
        ...ct,
        tax_type: taxTypes.find((t) => t.id === ct.tax_type_id) || null,
        tax_rate: taxRates.find((r) => r.id === ct.tax_rate_id) || null,
      }));

      setCompanyTaxes(enriched);
    } catch (e) {
      console.error("Failed loading company taxes", e);
      setCompanyTaxes([]);
    }
  }

  async function save(companyTax: CompanyTax) {
    setSaving(true);
    try {
      await fetch(`/api/companies/${companyTax.company_id}/taxes/${companyTax.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyTax),
      });
      await loadCompanyTaxes(companyTax.company_id);
    } catch (e) {
      console.error("Save error", e);
    }
    setSaving(false);
  }

  if (loading) return <div className="text-white">Loading tax settings…</div>;

  return (
    <div className="p-6">
      {/* Company Switcher */}
      <div className="mb-6 flex gap-3">
        <select
          value={selectedCompany ?? ""}
          onChange={(e) => loadCompanyTaxes(e.target.value)}
          className="glass-select px-3 py-2 rounded-xl"
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tax List */}
      <div className="grid gap-4">
        {companyTaxes.map((t) => (
          <div key={t.id} className="glass-card p-5 rounded-2xl">
            <div className="font-semibold text-white">{t.tax_type?.name}</div>
            <div className="text-sm opacity-70">{t.tax_rate?.name ?? "No rate"}</div>

            <div className="mt-4">
              <label className="text-xs opacity-60 block">Active</label>
              <input
                type="checkbox"
                checked={t.is_active}
                onChange={(e) =>
                  save({
                    ...t,
                    is_active: e.target.checked,
                  })
                }
              />
            </div>
          </div>
        ))}
      </div>

      {saving && <div className="mt-4 text-green-400">Saving…</div>}
    </div>
  );
}
