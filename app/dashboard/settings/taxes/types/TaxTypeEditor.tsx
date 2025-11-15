// web/app/dashboard/settings/taxes/TaxTypeEditor.tsx
"use client";

import React, { useState } from "react";

export type TaxType = {
  id: string;
  tenant_id?: string | null;
  name: string;
  code: string;
  description?: string | null;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
};

type UpsertPayload = {
  name: string;
  code: string;
  description?: string | null;
  active: boolean;
};

type Props = {
  initial?: Partial<TaxType> | null;
  onSave: (payload: UpsertPayload) => Promise<void> | void;
  onClose: () => void;
};

export default function TaxTypeEditor({ initial = null, onSave, onClose }: Props): JSX.Element {
  const [name, setName] = useState<string>(initial?.name ?? "");
  const [code, setCode] = useState<string>(initial?.code ?? "");
  const [description, setDescription] = useState<string>(initial?.description ?? "");
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);

    // simple client validation
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!code.trim()) {
      setError("Code is required");
      return;
    }

    const payload: UpsertPayload = {
      name: name.trim(),
      code: code.trim(),
      description: description.trim() || null,
      active,
    };

    try {
      setSaving(true);
      await onSave(payload);
      // onSave should close modal or caller will call onClose
    } catch (err: any) {
      setError(String(err?.message ?? "Failed to save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="p-6 rounded-2xl bg-white/10 border border-white/20 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">
          {initial?.id ? "Edit Tax Type" : "New Tax Type"}
        </h2>

        <div className="space-y-3">
          <input
            className="w-full p-2 rounded-lg bg-black/30 text-white border border-white/20"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
          />

          <input
            className="w-full p-2 rounded-lg bg-black/30 text-white border border-white/20"
            placeholder="Code (e.g. gst)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={saving}
          />

          <textarea
            className="w-full p-2 rounded-lg bg-black/30 text-white border border-white/20"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
          />

          <label className="flex items-center gap-2 text-white">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              disabled={saving}
            />
            Active
          </label>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/20 text-white"
            disabled={saving}
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
