// web/app/dashboard/settings/currencies/CurrencyEditor.tsx
"use client";

import React, { useState } from "react";
import type { CurrencyRow } from "./types";
import { CurrenciesAPI } from "./api";

type Props = {
  initial?: Partial<CurrencyRow> | null;
  tenantId?: string | null;
  companyId?: string | null;
  onClose: () => void;
};

export default function CurrencyEditor({ initial = null, tenantId, companyId, onClose }: Props) {
  const isEdit = Boolean(initial && initial.code);
  const [form, setForm] = useState({
    code: (initial?.code || "").toUpperCase(),
    symbol: initial?.symbol || "",
    precision: typeof initial?.precision === "number" ? initial!.precision : 2,
    locale: initial?.locale || "",
    active: initial?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!form.code || !form.symbol || Number.isNaN(Number(form.precision))) {
      setError("Code, symbol and precision are required.");
      return;
    }

    setSaving(true);
    const payload = {
      code: form.code.toUpperCase(),
      symbol: form.symbol,
      precision: Number(form.precision),
      locale: form.locale || null,
      active: !!form.active,
    };

    try {
      if (companyId) {
        await CurrenciesAPI.upsertCompany(companyId, payload, tenantId ?? undefined);
      } else {
        await CurrenciesAPI.upsertTenant(payload, tenantId ?? undefined);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-lg flex items-center justify-center z-50">
      <div className="bg-white/8 border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-xl">
        <h2 className="text-2xl text-white mb-4">{isEdit ? "Edit Currency" : "Add Currency"}</h2>

        <div className="space-y-3">
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="Code (USD)"
            className="w-full p-2 rounded-xl bg-black/30 text-white border border-white/20"
            maxLength={8}
          />
          <input
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            placeholder="Symbol ($)"
            className="w-full p-2 rounded-xl bg-black/30 text-white border border-white/20"
          />
          <input
            value={String(form.precision)}
            type="number"
            onChange={(e) => setForm({ ...form, precision: Number(e.target.value) })}
            className="w-full p-2 rounded-xl bg-black/30 text-white border border-white/20"
            min={0}
            step={1}
          />
          <input
            value={form.locale}
            onChange={(e) => setForm({ ...form, locale: e.target.value })}
            placeholder="Locale (en-US)"
            className="w-full p-2 rounded-xl bg-black/30 text-white border border-white/20"
          />

          <div className="flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <label htmlFor="active" className="text-white">Active</label>
          </div>

          {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
        </div>

        <div className="flex justify-end mt-6 gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/20 text-white">Cancel</button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
