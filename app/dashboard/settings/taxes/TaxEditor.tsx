// web/app/dashboard/settings/taxes/TaxEditor.tsx
"use client";

import React, { useState } from "react";
import { TaxesAPI } from "./api";
import { TaxRateInput, type TaxRateInputType } from "./schema";

type Props = {
  initial?: Partial<TaxRateInputType> | null;
  tenantId?: string | null;
  companyId?: string | null;
  onSaved: () => void;
  onClose: () => void;
};

export default function TaxEditor({
  initial = null,
  tenantId,
  companyId,
  onSaved,
  onClose,
}: Props) {
  const isCompany = Boolean(companyId);

  const [form, setForm] = useState<TaxRateInputType>({
    name: initial?.name ?? "",
    rate: initial?.rate ?? 0,
    type: initial?.type ?? "vat",
    country: initial?.country ?? "",
    state: initial?.state ?? "",
    city: initial?.city ?? "",
    active: initial?.active ?? true,
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update(field: keyof TaxRateInputType, value: any) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function save() {
    setError(null);

    // Validate with Zod
    const result = TaxRateInput.safeParse(form);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    try {
      setSaving(true);
      if (isCompany && companyId) {
        await TaxesAPI.upsertCompany(companyId, result.data, tenantId ?? undefined);
      } else {
        await TaxesAPI.upsertTenant(result.data, tenantId ?? undefined);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl w-full max-w-lg">
        <h2 className="text-2xl text-white mb-4">
          {isCompany ? "Company Tax" : "Tenant Tax"}
        </h2>

        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(v) => update("name", v)} />

          <Input
            label="Rate (decimal)"
            type="number"
            value={form.rate}
            onChange={(v) => update("rate", parseFloat(v))}
          />

          <Input label="Type" value={form.type} onChange={(v) => update("type", v)} />

          <div className="grid grid-cols-3 gap-2">
            <Input label="Country" value={form.country} onChange={(v) => update("country", v)} />
            <Input label="State" value={form.state} onChange={(v) => update("state", v)} />
            <Input label="City" value={form.city} onChange={(v) => update("city", v)} />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => update("active", e.target.checked)}
            />
            <label className="text-white">Active</label>
          </div>

          {error && <p className="text-red-400">{error}</p>}

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/20 text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-white block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 bg-black/30 text-white rounded-lg border border-white/20"
      />
    </div>
  );
}
