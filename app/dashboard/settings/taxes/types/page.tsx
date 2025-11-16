"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2 } from "lucide-react";
import apiClient from "@/lib/api-client";

type TaxType = {
  id?: string;
  name?: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

type TaxTypeModalProps = {
  mode: "create" | "edit";
  data: TaxType;
  onSave: () => void;
  onClose: () => void;
};

function TaxTypeModal({ mode, data, onSave, onClose }: TaxTypeModalProps) {
  const [form, setForm] = useState<TaxType>({
    name: data?.name || "",
    description: data?.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      if (mode === "create") {
        await apiClient.post("/api/global/tax-types", form);
      } else {
        await apiClient.put(`/api/global/tax-types/${data.id}`, form);
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <div className="glass border border-white/20 rounded-3xl p-6 w-full max-w-lg">
        <h3 className="text-xl font-semibold glass-text mb-4">
          {mode === "create" ? "Create Tax Type" : "Edit Tax Type"}
        </h3>

        <div className="space-y-4">
          <input
            className="glass-input"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <textarea
            className="glass-input min-h-[120px]"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <div className="flex justify-end gap-4 pt-4">
            <button onClick={onClose} className="px-4 py-2 bg-white/10 rounded-xl">
              Cancel
            </button>
            <button onClick={submit} disabled={saving} className="px-4 py-2 bg-blue-500/80 rounded-xl text-white">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TaxTypesPage() {
  const [items, setItems] = useState<TaxType[]>([]);
  const [modal, setModal] = useState<TaxTypeModalProps | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/api/global/tax-types");
      setItems(res.data?.data || []);
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
    if (!confirm("Delete tax type?")) return;
    try {
      await apiClient.delete(`/api/global/tax-types/${id}`);
      load();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold glass-text">Tax Types</h2>
        <button
          onClick={() => setModal({ mode: "create", data: {}, onSave: load, onClose: () => setModal(null) })}
          className="px-4 py-2 glass border border-white/20 rounded-xl"
        >
          <Plus size={18} />
        </button>
      </div>

      {loading && <div className="text-gray-300">Loading...</div>}

      <div className="space-y-3">
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 glass rounded-2xl border border-white/20 flex justify-between"
          >
            <div>
              <div className="text-lg glass-text">{t.name}</div>
              <div className="text-gray-300 text-sm">{t.description}</div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModal({ mode: "edit", data: t, onSave: load, onClose: () => setModal(null) })} className="p-2">
                <Edit2 />
              </button>
              <button onClick={() => remove(t.id)} className="p-2 hover:bg-red-400/20 rounded-xl">
                <Trash2 />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {modal && <TaxTypeModal {...modal} />}
    </div>
  );
}
