// Replace your existing TaxTypeModal with this exact block

import React, { useState } from "react";
import apiClient from "@/lib/api-client";

type TaxType = {
  id?: string;
  name?: string;
  description?: string;
};

type TaxTypeModalProps = {
  mode: "create" | "edit";
  data: TaxType;
  onSave: () => void;
  onClose: () => void;
};

export function TaxTypeModal({ mode, data, onSave, onClose }: TaxTypeModalProps) {
  const [form, setForm] = useState<TaxType>({
    name: data?.name || "",
    description: data?.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
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
      // user-friendly error extract
      const msg = err?.response?.data?.error || err?.response?.data?.message || "Save failed";
      setError(String(msg));
      console.error("TaxTypeModal save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const wrapperStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "16px",
  };

  const boxStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 720,
    borderRadius: 18,
    padding: 20,
    background: "linear-gradient(180deg, rgba(20,20,20,0.95), rgba(10,10,10,0.92))",
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
    color: "#fff",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.02)",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 6,
    display: "block",
  };

  const footerBtnStyle: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
  };

  return (
    <div style={wrapperStyle} role="dialog" aria-modal="true">
      <div style={boxStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
            {mode === "create" ? "Create Tax Type" : "Edit Tax Type"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Name</label>
          <input
            style={inputStyle}
            placeholder="Ex: GST"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={150}
            autoFocus
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Description</label>
          <textarea
            style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
            placeholder="Optional description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {error && (
          <div style={{ color: "#ffb4b4", marginBottom: 10, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ ...footerBtnStyle, background: "rgba(255,255,255,0.06)", color: "#fff" }}
            type="button"
            disabled={saving}
          >
            Cancel
          </button>

          <button
            onClick={save}
            style={{ ...footerBtnStyle, background: "#0ea5ff", color: "#042a38" }}
            type="button"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
