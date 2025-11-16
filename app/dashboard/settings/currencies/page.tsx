"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2 } from "lucide-react";
import apiClient from "@/lib/api-client";

type Currency = {
  id?: string;
  code?: string;
  name?: string;
  symbol?: string | null;
  precision?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

type CurrencyModalProps = {
  mode: "create" | "edit";
  data: Currency;
  onClose: () => void;
  onSave: () => void;
};

function CurrencyModal({ mode, data, onClose, onSave }: CurrencyModalProps) {
  const [form, setForm] = useState<Currency>({
    code: data?.code || "",
    name: data?.name || "",
    symbol: data?.symbol ?? "",
    precision: data?.precision ?? 2,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic required validation
  const valid =
    Boolean(form.code && form.code.length === 3 && form.name && form.precision !== undefined);

  const save = async () => {
    if (!valid) {
      setError("Enter valid code, name and precision.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        code: String(form.code).trim().toUpperCase(),
        name: String(form.name).trim(),
        symbol: form.symbol === "" ? null : String(form.symbol),
        precision: Number(form.precision) || 2,
      };

      if (mode === "create") {
        await apiClient.post("/api/global/currencies", payload);
      } else {
        await apiClient.put(`/api/global/currencies/${data.id}`, payload);
      }

      await onSave();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "save_failed");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl p-6 w-full max-w-lg border border-white/20"
      >
        <h2 className="text-xl font-semibold mb-4 glass-text">
          {mode === "create" ? "Create Currency" : "Edit Currency"}
        </h2>

        <div className="space-y-4">
          {/* Code */}
          <input
            value={form.code}
            maxLength={3}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="Code (USD)"
            className="glass-input"
          />

          {/* Name */}
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Name (US Dollar)"
            className="glass-input"
          />

          {/* Symbol */}
          <input
            value={form.symbol ?? ""}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            placeholder="Symbol ($)"
            className="glass-input"
          />

          {/* Precision */}
          <input
            type="number"
            min={0}
            step={1}
            value={String(form.precision ?? 2)}
            onChange={(e) =>
              setForm({
                ...form,
                precision: Math.max(0, Number(e.target.value) || 0),
              })
            }
            placeholder="Precision (2)"
            className="glass-input"
          />

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <div className="flex justify-end gap-4 pt-4">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-white/10 rounded-xl"
            >
              Cancel
            </button>

            <button
              disabled={saving || !valid}
              onClick={save}
              className={`px-4 py-2 rounded-xl text-white ${
                saving || !valid ? "bg-blue-300/60" : "bg-blue-500/80"
              }`}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function CurrenciesPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Currency[]>([]);
  const [modal, setModal] = useState<CurrencyModalProps | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/api/global/currencies");
      setItems(res.data?.data || []);
    } catch (err: any) {
      setError("failed_to_load");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const remove = async (id?: string) => {
    if (!id) return;
    if (!confirm("Delete this currency?")) return;

    try {
      await apiClient.delete(`/api/global/currencies/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold glass-text">Currencies</h1>

        <button
          onClick={() =>
            setModal({
              mode: "create",
              data: {} as Currency,
              onClose: () => setModal(null),
              onSave: fetchData,
            })
          }
          className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/20 glass"
        >
          <Plus size={18} />
        </button>
      </div>

      {loading && <div className="text-gray-300">Loading...</div>}
      {error && <div className="text-red-400">{error}</div>}

      <div className="grid gap-3">
        {!loading &&
          items.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-4 glass border border-white/20 flex justify-between"
            >
              <div>
                <div className="text-lg font-medium glass-text">{c.name}</div>
                <div className="text-sm text-gray-300">
                  {c.code} · {c.symbol || "-"}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setModal({
                      mode: "edit",
                      data: c,
                      onClose: () => setModal(null),
                      onSave: fetchData,
                    })
                  }
                  className="p-2 rounded-xl hover:bg-white/20"
                >
                  <Edit2 size={18} />
                </button>

                <button
                  onClick={() => remove(c.id)}
                  className="p-2 rounded-xl hover:bg-red-500/30"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
      </div>

      {modal && <CurrencyModal {...modal} />}
    </div>
  );
}
