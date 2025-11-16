"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2 } from "lucide-react";
import apiClient from "@/lib/api-client";

type TaxTypeOption = { id: string; name: string };

type TaxRate = {
  id?: string;
  tax_type_id?: string;
  name?: string;
  rate?: number;
  tax_type_name?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

type TaxRateModalProps = {
  mode: "create" | "edit";
  data: TaxRate;
  taxTypes: TaxTypeOption[];
  onClose: () => void;
  onSave: () => void;
};

function TaxRateModal({ mode, data, taxTypes, onClose, onSave }: TaxRateModalProps) {
  const [form, setForm] = useState<TaxRate>({
    tax_type_id: data?.tax_type_id || "",
    name: data?.name || "",
    rate: data?.rate ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = Boolean(form.tax_type_id && form.name && form.rate !== undefined && !Number.isNaN(Number(form.rate)));

  const save = async () => {
    if (!valid) {
      setError("Please select a tax type, enter a name and a valid rate.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = { tax_type_id: form.tax_type_id, name: form.name, rate: Number(form.rate) };
      if (mode === "create") {
        await apiClient.post("/api/global/tax-rates", payload);
      } else {
        await apiClient.put(`/api/global/tax-rates/${data.id}`, payload);
      }
      await onSave();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || "Save failed");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <div className="glass border border-white/20 rounded-3xl p-6 w-full max-w-lg">
        <h3 className="text-xl font-semibold mb-4 glass-text">
          {mode === "create" ? "Create Tax Rate" : "Edit Tax Rate"}
        </h3>

        <div className="space-y-4">
          {taxTypes.length === 0 ? (
            <div className="text-yellow-300 text-sm">
              No tax types available. Create a tax type first.
            </div>
          ) : (
            <select
              value={form.tax_type_id}
              onChange={(e) => setForm({ ...form, tax_type_id: e.target.value })}
              className="glass-input"
            >
              <option value="">Select Tax Type</option>
              {taxTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          <input
            className="glass-input"
            placeholder="Rate Name (ex: GST 18%)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus={true}
          />

          <input
            className="glass-input"
            placeholder="Rate (%)"
            type="number"
            step="0.001"
            min="0"
            value={String(form.rate ?? "")}
            onChange={(e) => setForm({ ...form, rate: e.target.value === "" ? undefined : Number(e.target.value) })}
          />

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <div className="flex justify-end gap-4 pt-4">
            <button onClick={onClose} className="px-4 py-2 bg-white/10 rounded-xl" disabled={saving}>
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !valid}
              className={`px-4 py-2 rounded-xl text-white ${saving || !valid ? "bg-blue-300/60" : "bg-blue-500/80"}`}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TaxRatesPage() {
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [types, setTypes] = useState<TaxTypeOption[]>([]);
  const [modal, setModal] = useState<TaxRateModalProps | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([apiClient.get("/api/global/tax-types"), apiClient.get("/api/global/tax-rates")]);
      setTypes(t.data?.data || []);
      setRates(r.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id?: string) => {
    if (!id) return;
    if (!confirm("Delete this tax rate?")) return;
    try {
      await apiClient.delete(`/api/global/tax-rates/${id}`);
      load();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <h2 className="text-2xl font-semibold glass-text">Tax Rates</h2>
        <button
          onClick={() =>
            setModal({
              mode: "create",
              data: {} as TaxRate,
              taxTypes: types,
              onClose: () => setModal(null),
              onSave: load,
            })
          }
          className="px-4 py-2 glass border border-white/20 rounded-xl"
        >
          <Plus />
        </button>
      </div>

      {loading && <div className="text-gray-300">Loading...</div>}

      <div className="space-y-4">
        {rates.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 glass border border-white/20 rounded-2xl flex justify-between"
          >
            <div>
              <div className="text-lg glass-text">{r.name}</div>
              <div className="text-sm text-gray-300">
                {r.tax_type_name} · {r.rate}%
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  setModal({
                    mode: "edit",
                    data: r,
                    taxTypes: types,
                    onClose: () => setModal(null),
                    onSave: load,
                  })
                }
                className="p-2"
              >
                <Edit2 />
              </button>
              <button onClick={() => remove(r.id)} className="p-2 hover:bg-red-500/20 rounded-xl">
                <Trash2 />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {modal && <TaxRateModal {...modal} />}
    </div>
  );
}
