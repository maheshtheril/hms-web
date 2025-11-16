// web/app/dashboard/settings/taxes/TaxEditor.tsx
"use client";

import React, { useEffect, useState } from "react";
import { TaxesAPI } from "./api";
import type { TaxRateRow } from "./types";

export type Company = { id: string; name: string };
export type TaxType = { id: string; name: string; code: string };

type TaxPayload = {
  name: string;
  rate: number;
  tax_type_id?: string | null;
  type?: string | null; // legacy
  country?: string | null;
  state?: string | null;
  city?: string | null;
  active: boolean;
};

type Props = {
  initial?: Partial<TaxRateRow> | null;
  tenantId?: string | null;
  companyId?: string | null; // page-level selected company (not necessarily editor's company)
  taxTypes?: TaxType[];
  companies?: Company[];
  onSaved: () => Promise<void> | void;
  onClose: () => void;
};

export default function TaxEditor({
  initial = null,
  tenantId = null,
  companyId = null,
  taxTypes = [],
  companies = [],
  onSaved,
  onClose,
}: Props): JSX.Element {
  // Determine initial scope: company override if initial.company_id exists
  const initialScope = initial?.company_id ? "company" : "organization";
  const [scope, setScope] = useState<"organization" | "company">(initialScope as any);

  // Editor fields
  const [name, setName] = useState<string>(initial?.name ?? "");
  const [rate, setRate] = useState<number>(initial?.rate ?? 0);
  const [country, setCountry] = useState<string>(initial?.country ?? "");
  const [stateVal, setStateVal] = useState<string>(initial?.state ?? "");
  const [city, setCity] = useState<string>(initial?.city ?? "");
  const [active, setActive] = useState<boolean>(initial?.active ?? true);

  // Prefer tax_type_id when taxTypes are provided; fall back to freeform 'type'
  const [taxTypeId, setTaxTypeId] = useState<string | null>((initial as any)?.tax_type_id ?? null);
  const [freeformType, setFreeformType] = useState<string | null>(initial?.type ?? null);

  // Selected company for company-scope saving. Use initial.company_id > page-level companyId.
  const [selectedCompany, setSelectedCompany] = useState<string | null>(
    (initial as any)?.company_id ?? companyId ?? null
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If the initial changes (rare), sync minimal fields
    if (initial) {
      setName(initial.name ?? "");
      setRate(initial.rate ?? 0);
      setCountry(initial.country ?? "");
      setStateVal(initial.state ?? "");
      setCity(initial.city ?? "");
      setActive(initial.active ?? true);
      setTaxTypeId((initial as any)?.tax_type_id ?? null);
      setFreeformType(initial.type ?? null);
      setSelectedCompany((initial as any)?.company_id ?? companyId ?? null);
      setScope((initial as any)?.company_id ? "company" : "organization");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  function resetErrors() {
    setError(null);
  }

  async function handleSave() {
    resetErrors();

    // Basic validation
    if (!name || !name.trim()) {
      setError("Name is required");
      return;
    }
    if (isNaN(rate) || rate < 0) {
      setError("Rate must be a non-negative number");
      return;
    }

    // Build payload
    const payload: TaxPayload = {
      name: name.trim(),
      rate: Number(rate),
      country: country?.trim() || null,
      state: stateVal?.trim() || null,
      city: city?.trim() || null,
      active: !!active,
    };

    // prefer tax_type_id when taxTypes exist
    if (taxTypes && taxTypes.length > 0) {
      if (!taxTypeId) {
        setError("Please select a tax type");
        return;
      }
      payload.tax_type_id = taxTypeId;
    } else {
      // legacy freeform type
      payload.type = freeformType ?? "custom";
    }

    // If editing existing (has id) we can decide to call update endpoint — but here we use upsert endpoints
    try {
      setSaving(true);

      // Company scope
      if (scope === "company") {
        if (!selectedCompany) {
          throw new Error("Select a company for a company-level tax");
        }
        // TaxesAPI.upsertCompany(companyId, payload, tenantId)
        await TaxesAPI.upsertCompany(selectedCompany, payload as any, tenantId ?? undefined);
      } else {
        // Organization default (tenant-level)
        await TaxesAPI.upsertTenant(payload as any, tenantId ?? undefined);
      }

      // success -> caller will refresh lists
      await Promise.resolve(onSaved());
      onClose();
    } catch (err: any) {
      console.error("Failed to save tax", err);
      setError(String(err?.message ?? err ?? "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  const savingLabel =
    scope === "company" ? "Saving as Company override" : "Saving as Organization default";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white/6 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">
            {initial?.id ? "Edit Tax" : "New Tax"}
            <span className="text-sm text-white/60 ml-2">
              ({scope === "company" ? "Company override" : "Organization default"})
            </span>
          </h3>

          <button
            onClick={onClose}
            className="text-white/60 hover:text-white px-2 py-1 rounded"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {/* Scope */}
          <div className="flex items-center gap-4">
            <label className="text-white/70">Scope</label>

            <label className="flex items-center gap-2 text-white">
              <input
                type="radio"
                name="scope"
                checked={scope === "organization"}
                onChange={() => {
                  setScope("organization");
                  setSelectedCompany(null);
                }}
                disabled={saving}
              />
              Organization default
            </label>

            <label className="flex items-center gap-2 text-white">
              <input
                type="radio"
                name="scope"
                checked={scope === "company"}
                onChange={() => setScope("company")}
                disabled={saving}
              />
              Company override
            </label>
          </div>

          {/* Company chooser (if company scope) */}
          {scope === "company" && (
            <div>
              <label className="text-white/70 mb-1 block">Company</label>
              <select
                value={selectedCompany ?? ""}
                onChange={(e) => setSelectedCompany(e.target.value || null)}
                className="w-full p-2 rounded-lg bg-black/30 text-white border border-white/20"
                disabled={saving}
              >
                <option value="">— Select company —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Name + Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/70 mb-1 block">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 rounded-lg bg-black/30 text-white border border-white/20"
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-white/70 mb-1 block">Rate (decimal, e.g. 0.18)</label>
              <input
                type="number"
                step="0.0001"
                value={String(rate)}
                onChange={(e) => setRate(Number(e.target.value || 0))}
                className="w-full p-2 rounded-lg bg-black/30 text-white border border-white/20"
                disabled={saving}
              />
            </div>
          </div>

          {/* Tax type dropdown or legacy type */}
          {taxTypes && taxTypes.length > 0 ? (
            <div>
              <label className="text-white/70 mb-1 block">Tax Type</label>
              <select
                value={taxTypeId ?? ""}
                onChange={(e) => setTaxTypeId(e.target.value || null)}
                className="w-full p-2 rounded-lg bg-black/30 text-white border border-white/20"
                disabled={saving}
              >
                <option value="">— Select tax type —</option>
                {taxTypes.map((tt) => (
                  <option key={tt.id} value={tt.id}>
                    {tt.name} ({tt.code})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-white/70 mb-1 block">Type (legacy)</label>
              <input
                value={freeformType ?? ""}
                onChange={(e) => setFreeformType(e.target.value || null)}
                className="w-full p-2 rounded-lg bg-black/30 text-white border border-white/20"
                disabled={saving}
              />
            </div>
          )}

          {/* Location fields */}
          <div className="grid grid-cols-3 gap-3">
            <input
              placeholder="Country"
              value={country ?? ""}
              onChange={(e) => setCountry(e.target.value)}
              className="p-2 rounded-lg bg-black/30 text-white border border-white/20"
              disabled={saving}
            />
            <input
              placeholder="State"
              value={stateVal ?? ""}
              onChange={(e) => setStateVal(e.target.value)}
              className="p-2 rounded-lg bg-black/30 text-white border border-white/20"
              disabled={saving}
            />
            <input
              placeholder="City"
              value={city ?? ""}
              onChange={(e) => setCity(e.target.value)}
              className="p-2 rounded-lg bg-black/30 text-white border border-white/20"
              disabled={saving}
            />
          </div>

          <label className="flex items-center gap-2 text-white">
            <input
              type="checkbox"
              checked={!!active}
              onChange={(e) => setActive(e.target.checked)}
              disabled={saving}
            />
            Active
          </label>

          {error && <div className="text-red-400">{error}</div>}
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-end gap-3">
          <div className="text-sm text-white/60 mr-auto">{saving ? savingLabel : null}</div>

          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-white/10 text-white"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white"
          >
            {saving ? "Saving..." : initial?.id ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
