// web/app/dashboard/settings/taxes/TaxEditor.tsx
"use client";

import React, { useEffect, useState } from "react";
import { TaxRateInput, type TaxRateInputType } from "./schema";
import { TaxesAPI } from "./api";
import type { TaxRateRow } from "./types";

export type Company = { id: string; name: string };
export type TaxType = { id: string; name: string; code: string };

type Props = {
  initial?: Partial<TaxRateRow> | null; // may include company_id
  tenantId?: string | null;
  companyId?: string | null; // the "default selected company" (page-level)
  taxTypes?: TaxType[]; // preloaded list
  companies?: Company[]; // preloaded list
  onSaved: () => void;
  onClose: () => void;
};

type Scope = "tenant" | "company";

export default function TaxEditor({
  initial = null,
  tenantId,
  companyId: defaultCompanyId,
  taxTypes = [],
  companies = [],
  onSaved,
  onClose,
}: Props): JSX.Element {
  // If initial.company_id is present, that indicates this edit is a company-level override
  const initialScope: Scope = initial?.company_id ? "company" : "tenant";

  const [scope, setScope] = useState<Scope>(initialScope);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(initial?.company_id ?? defaultCompanyId ?? null);

  const [form, setForm] = useState<TaxRateInputType>({
    name: initial?.name ?? "",
    rate: initial?.rate ?? 0,
    type: initial?.type ?? "", // legacy - will be mapped if tax_type_id not sent
    country: initial?.country ?? "",
    state: initial?.state ?? "",
    city: initial?.city ?? "",
    active: initial?.active ?? true,
  });

  // new fields: selected tax_type_id (prefer tax_type_id if present)
  const [taxTypeId, setTaxTypeId] = useState<string | null>((initial as any)?.tax_type_id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // if scope is changed to tenant, clear selectedCompany
    if (scope === "tenant") setSelectedCompany(null);
    else if (scope === "company" && !selectedCompany && defaultCompanyId) setSelectedCompany(defaultCompanyId);
  }, [scope, defaultCompanyId]);

  function update<K extends keyof TaxRateInputType>(field: K, value: TaxRateInputType[K]) {
    setForm((s) => ({ ...s, [field]: value }));
  }

  async function save() {
    setError(null);

    // build payload. Prefer tax_type_id if selected (backend expects tax_type_id on new schema)
    const payload: any = {
      name: form.name.trim(),
      rate: Number(form.rate),
      country: form.country?.trim() || null,
      state: form.state?.trim() || null,
      city: form.city?.trim() || null,
      active: !!form.active,
    };

    // if dynamic tax types exist, require selection
    if (taxTypes && taxTypes.length > 0) {
      if (!taxTypeId) {
        setError("Select a Tax Type");
        return;
      }
      payload.tax_type_id = taxTypeId;
    } else {
      // legacy fallback to type string
      payload.type = form.type || "custom";
    }

    // basic validation
    if (!payload.name) {
      setError("Name is required");
      return;
    }
    if (isNaN(payload.rate) || payload.rate < 0) {
      setError("Rate must be a non-negative number");
      return;
    }

    try {
      setSaving(true);

      if (scope === "company") {
        if (!selectedCompany) throw new Error("Select a company for company-scope tax");
        await TaxesAPI.upsertCompany(selectedCompany, payload, tenantId ?? undefined);
      } else {
        await TaxesAPI.upsertTenant(payload, tenantId ?? undefined);
      }

      await onSaved();
      onClose();
    } catch (err: any) {
      console.error("Save failed", err);
      setError(String(err?.message ?? err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="w-full max-w-lg p-6 rounded-2xl bg-white/6 border border-white/10">
        <h2 className="text-2xl text-white mb-4">{scope === "company" ? "Company Tax (override)" : "Tenant Tax"}</h2>

        <div className="space-y-3">
          {/* Scope selector */}
          <div className="flex items-center gap-4">
            <label className="text-white/80">Scope:</label>
            <label className="flex items-center gap-2">
              <input type="radio" name="scope" checked={scope === "tenant"} onChange={() => setScope("tenant")} />
              <span className="text-white">Tenant</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="scope" checked={scope === "company"} onChange={() => setScope("company")} />
              <span className="text-white">Company</span>
            </label>
          </div>

          {/* Company selector (shown only when scope=company) */}
          {scope === "company" && (
            <div>
              <label className="text-white block mb-1">Company</label>
              <select
                value={selectedCompany ?? ""}
                onChange={(e) => setSelectedCompany(e.target.value || null)}
                className="w-full p-2 rounded-xl bg-black/30 text-white border border-white/20"
              >
                <option value="">— Select company —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-white block mb-1">Name</label>
            <input value={form.name} onChange={(e) => update("name", e.target.value)} className="w-full p-2 rounded-xl bg-black/30 text-white border border-white/20" />
          </div>

          <div>
            <label className="text-white block mb-1">Rate (decimal, e.g. 0.18)</label>
            <input type="number" step="0.0001" value={String(form.rate)} onChange={(e) => update("rate", Number(e.target.value || 0))} className="w-full p-2 rounded-xl bg-black/30 text-white border border-white/20" />
          </div>

          {/* Tax type dropdown (dynamic) */}
          {taxTypes && taxTypes.length > 0 ? (
            <div>
              <label className="text-white block mb-1">Tax Type</label>
              <select value={taxTypeId ?? ""} onChange={(e) => setTaxTypeId(e.target.value || null)} className="w-full p-2 rounded-xl bg-black/30 text-white border border-white/20">
                <option value="">— Select tax type —</option>
                {taxTypes.map((tt) => <option key={tt.id} value={tt.id}>{tt.name} ({tt.code})</option>)}
              </select>
            </div>
          ) : (
            // legacy fallback to freeform type string
            <div>
              <label className="text-white block mb-1">Type</label>
              <input value={form.type ?? ""} onChange={(e) => update("type", e.target.value)} className="w-full p-2 rounded-xl bg-black/30 text-white border border-white/20" />
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Country" value={String(form.country ?? "")} onChange={(e) => update("country", e.target.value || "")} className="p-2 rounded-xl bg-black/30 text-white border border-white/20" />
            <input placeholder="State" value={String(form.state ?? "")} onChange={(e) => update("state", e.target.value || "")} className="p-2 rounded-xl bg-black/30 text-white border border-white/20" />
            <input placeholder="City" value={String(form.city ?? "")} onChange={(e) => update("city", e.target.value || "")} className="p-2 rounded-xl bg-black/30 text-white border border-white/20" />
          </div>

          <div className="flex items-center gap-2">
            <input id="active" type="checkbox" checked={!!form.active} onChange={(e) => update("active", e.target.checked)} />
            <label htmlFor="active" className="text-white">Active</label>
          </div>

          {error && <p className="text-red-400">{error}</p>}

          <div className="flex justify-end gap-3 mt-4">
            <button onClick={onClose} type="button" className="px-4 py-2 bg-white/20 text-white rounded-lg">Cancel</button>
            <button disabled={saving} onClick={save} type="button" className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
