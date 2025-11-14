"use client";

import React, { useState, useEffect } from "react";
import apiClient from "@/lib/api-client";

export default function SettingsForm({
  tenantId,
  companyId,
  onSaved
}: {
  tenantId: string | null;
  companyId: string | null;
  onSaved?: (timestamp?: number) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState({
    tenant_name: "",
    currency: "USD",
    tax_rate: 0,
    timezone: "UTC"
  });

  useEffect(() => {
    if (!tenantId) return;

    (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          tenant_id: tenantId,
          company_id: companyId ?? ""
        }).toString();

        const res = await apiClient.get(`/api/hms/settings?${qs}`, { withCredentials: true });
        const s = res?.data?.data ?? {};

        setData({
          tenant_name: s.tenant_name ?? "",
          currency: s.currency ?? "USD",
          tax_rate: Number(s.tax_rate ?? 0),
          timezone: s.timezone ?? "UTC"
        });
      } catch (err) {
        console.error("load settings failed", err);
        setError("Failed to load settings");
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId, companyId]);

  const save = async () => {
    if (!tenantId) {
      setError("Missing tenant context");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiClient.post(
        "/api/hms/settings",
        {
          ...data,
          tenant_id: tenantId,
          company_id: companyId
        },
        { withCredentials: true }
      );

      onSaved?.(Date.now());
    } catch (err) {
      console.error("save failed", err);
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-white/60">Loading…</div>;

  return (
    <div className="space-y-6">
      {error && <div className="text-rose-400 text-sm">{error}</div>}

      <div className="space-y-2">
        <label className="text-sm text-white/70">Tenant Name</label>
        <input
          className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
          value={data.tenant_name}
          onChange={(e) => setData({ ...data, tenant_name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-white/70">Currency</label>
        <select
          className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
          value={data.currency}
          onChange={(e) => setData({ ...data, currency: e.target.value })}
        >
          <option>USD</option>
          <option>INR</option>
          <option>AED</option>
          <option>EUR</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-white/70">Tax Rate (%)</label>
        <input
          type="number"
          className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
          value={data.tax_rate}
          onChange={(e) => setData({ ...data, tax_rate: Number(e.target.value) })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-white/70">Timezone</label>
        <select
          className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
          value={data.timezone}
          onChange={(e) => setData({ ...data, timezone: e.target.value })}
        >
          <option>UTC</option>
          <option>Asia/Kolkata</option>
          <option>Asia/Dubai</option>
          <option>Europe/London</option>
        </select>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 text-white shadow-lg disabled:opacity-40"
      >
        {saving ? "Saving…" : "Save Settings"}
      </button>
    </div>
  );
}
