"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "@/lib/api-client";

/**
 * Advanced SettingsForm (tenant + company aware)
 *
 * Props:
 * - tenantId: string | null  (required for all saves)
 * - companyId: string | null (optional, used for company-scoped settings)
 *
 * Backend endpoints expected (tenant/company query params or body):
 * GET  /api/hms/settings?tenant_id=&company_id=
 * POST /api/hms/settings  body must include tenant_id and optional company_id and version
 * GET  /api/hms/settings/history?tenant_id=&company_id=
 *
 * Important:
 * - The component will reload when tenantId/companyId change.
 * - Saving without tenantId will be blocked.
 */

type SettingsShape = {
  tenant_name: string;
  address?: string;
  currency: string;
  tax_rate: number;
  timezone: string;
  default_patient_type?: string;
  metadata?: Record<string, any>;
};

type HistoryRow = {
  change_type: "insert" | "update" | "delete";
  changed_at: string;
  changed_by?: string;
  value?: Record<string, any>;
  version?: number;
};

function buildQs(params: Record<string, any>) {
  return Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

export default function HmsSettingsForm({
  onSaved,
  tenantId,
  companyId,
}: {
  onSaved?: (at?: number | string) => void;
  tenantId?: string | null;
  companyId?: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverVersion, setServerVersion] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"general" | "billing" | "defaults" | "raw" | "history">("general");

  const [rawJsonText, setRawJsonText] = useState<string>("");

  const [settings, setSettings] = useState<SettingsShape>({
    tenant_name: "",
    address: "",
    currency: "USD",
    tax_rate: 0,
    timezone: "UTC",
    default_patient_type: "CASH",
    metadata: {},
  });

  // load initial settings (re-run when tenantId / companyId change)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const qs = buildQs({ tenant_id: tenantId, company_id: companyId });
        const res = await apiClient.get(`/api/hms/settings${qs ? "?" + qs : ""}`, { withCredentials: true });
        const payload = res?.data?.data ?? {};
        if (!mounted) return;
        const serverSettings: SettingsShape = {
          tenant_name: payload?.tenant_name ?? "",
          address: payload?.address ?? "",
          currency: payload?.currency ?? "USD",
          tax_rate: Number(payload?.tax_rate ?? 0),
          timezone: payload?.timezone ?? "UTC",
          default_patient_type: payload?.default_patient_type ?? "CASH",
          metadata: payload?.metadata ?? {},
        };
        setSettings(serverSettings);
        setRawJsonText(JSON.stringify(serverSettings, null, 2));
        setServerVersion(payload?.version ?? 1);
        setError(null);
      } catch (err) {
        console.error("load settings", err);
        setError("Failed to load settings.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tenantId, companyId]);

  // fetch history lazily
  useEffect(() => {
    if (tab !== "history") return;
    (async () => {
      try {
        const qs = buildQs({ tenant_id: tenantId, company_id: companyId });
        const res = await apiClient.get(`/api/hms/settings/history${qs ? "?" + qs : ""}`, { withCredentials: true });
        setHistory(res?.data?.data ?? []);
      } catch (err) {
        console.error("load history", err);
        setError("Failed to load history");
      }
    })();
  }, [tab, tenantId, companyId]);

  // validation
  const validate = useCallback((s: SettingsShape) => {
    if (!s.tenant_name || s.tenant_name.trim().length < 1) return "Tenant name is required";
    if (!s.currency) return "Currency is required";
    if (isNaN(Number(s.tax_rate))) return "Tax rate must be a number";
    return null;
  }, []);

  // optimistic save helper (includes tenant/company in body)
  const doSave = useCallback(
    async (payload: SettingsShape, opts?: { force?: boolean }) => {
      if (!tenantId) {
        setError("Unable to save: tenant context not available.");
        return { ok: false };
      }

      setSaving(true);
      setError(null);
      try {
        const body = { ...payload, version: serverVersion, tenant_id: tenantId, company_id: companyId ?? null };
        const res = await apiClient.post("/api/hms/settings", body, { withCredentials: true });
        const newVersion = res?.data?.data?.version ?? (serverVersion ?? 1) + 1;
        setServerVersion(newVersion);
        setSettings(res?.data?.data ?? payload);
        setRawJsonText(JSON.stringify(res?.data?.data ?? payload, null, 2));
        onSaved?.(Date.now());
        window.dispatchEvent(new CustomEvent("hms-settings-saved", { detail: { savedAt: Date.now() } }));
        return { ok: true };
      } catch (err: any) {
        console.error("save failed", err);
        if (err?.response?.status === 409 && !opts?.force) {
          setError("Save conflict detected. Server version is newer. Reloaded server values.");
          try {
            const qs = buildQs({ tenant_id: tenantId, company_id: companyId });
            const reload = await apiClient.get(`/api/hms/settings${qs ? "?" + qs : ""}`, { withCredentials: true });
            const payload = reload?.data?.data ?? {};
            const serverSettings: SettingsShape = {
              tenant_name: payload?.tenant_name ?? "",
              address: payload?.address ?? "",
              currency: payload?.currency ?? "USD",
              tax_rate: Number(payload?.tax_rate ?? 0),
              timezone: payload?.timezone ?? "UTC",
              default_patient_type: payload?.default_patient_type ?? "CASH",
              metadata: payload?.metadata ?? {},
            };
            setSettings(serverSettings);
            setRawJsonText(JSON.stringify(serverSettings, null, 2));
            setServerVersion(payload?.version ?? serverVersion);
            return { ok: false, conflict: true };
          } catch (reloadErr) {
            console.error("reload after conflict failed", reloadErr);
            return { ok: false, conflict: true };
          }
        }
        setError(err?.message ?? "Save failed");
        return { ok: false };
      } finally {
        setSaving(false);
      }
    },
    [serverVersion, tenantId, companyId, onSaved]
  );

  // autosave debounce
  const autosaveTimeoutRef = React.useRef<number | null>(null);
  const scheduleAutosave = useCallback(
    (newSettings: SettingsShape) => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }
      autosaveTimeoutRef.current = window.setTimeout(async () => {
        const v = validate(newSettings);
        if (v) {
          setError(v);
          return;
        }
        await doSave(newSettings);
        autosaveTimeoutRef.current = null;
      }, 1200);
    },
    [doSave, validate]
  );

  React.useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) window.clearTimeout(autosaveTimeoutRef.current);
    };
  }, []);

  const updateField = useCallback(
    (patch: Partial<SettingsShape>, doAutosave = true) => {
      setSettings((s) => {
        const next = { ...s, ...patch };
        setRawJsonText(JSON.stringify(next, null, 2));
        if (doAutosave) scheduleAutosave(next);
        return next;
      });
    },
    [scheduleAutosave]
  );

  // Raw JSON apply
  const applyRawJson = useCallback(async () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      const merged = { ...settings, ...parsed } as SettingsShape;
      const v = validate(merged);
      if (v) {
        setError(v);
        return;
      }
      setSettings(merged);
      await doSave(merged);
      setTab("general");
    } catch (err: any) {
      setError("Invalid JSON: " + (err?.message ?? "parse error"));
    }
  }, [rawJsonText, settings, validate, doSave]);

  const exportJson = useCallback(() => {
    const out = { meta: { tenant_id: tenantId, company_id: companyId, version: serverVersion }, settings };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hms-settings${tenantId ? `-${tenantId}` : ""}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [settings, serverVersion, tenantId, companyId]);

  const importJson = useCallback((file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = String(ev.target?.result ?? "");
        setRawJsonText(text);
        const parsed = JSON.parse(text);
        // If file was exported with meta, allow applying settings only
        const payload = parsed?.settings ? parsed.settings : parsed;
        const merged = { ...settings, ...payload } as SettingsShape;
        setSettings(merged);
        scheduleAutosave(merged);
        setTab("general");
      } catch (err: any) {
        setError("Invalid JSON file: " + (err?.message ?? "parse error"));
      }
    };
    reader.readAsText(file);
  }, [settings, scheduleAutosave]);

  const resetToServer = useCallback(async () => {
    setLoading(true);
    try {
      const qs = buildQs({ tenant_id: tenantId, company_id: companyId });
      const res = await apiClient.get(`/api/hms/settings${qs ? "?" + qs : ""}`, { withCredentials: true });
      const payload = res?.data?.data ?? {};
      const serverSettings: SettingsShape = {
        tenant_name: payload?.tenant_name ?? "",
        address: payload?.address ?? "",
        currency: payload?.currency ?? "USD",
        tax_rate: Number(payload?.tax_rate ?? 0),
        timezone: payload?.timezone ?? "UTC",
        default_patient_type: payload?.default_patient_type ?? "CASH",
        metadata: payload?.metadata ?? {},
      };
      setSettings(serverSettings);
      setRawJsonText(JSON.stringify(serverSettings, null, 2));
      setServerVersion(payload?.version ?? serverVersion);
      setError(null);
    } catch (err) {
      console.error("reset failed", err);
      setError("Failed to reload server settings");
    } finally {
      setLoading(false);
    }
  }, [serverVersion, tenantId, companyId]);

  const renderHistory = useMemo(() => {
    if (!history || history.length === 0) return <div className="text-sm text-white/60">No history yet.</div>;
    return (
      <div className="space-y-3">
        {history.map((r, i) => (
          <div key={i} className="p-3 rounded-xl bg-white/3 border border-white/6">
            <div className="flex items-center justify-between text-xs text-white/60">
              <div>{r.change_type}</div>
              <div>{new Date(r.changed_at).toLocaleString()}</div>
            </div>
            <pre className="mt-2 text-[12px] max-h-40 overflow-auto bg-black/10 p-2 rounded">{JSON.stringify(r.value, null, 2)}</pre>
          </div>
        ))}
      </div>
    );
  }, [history]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2 items-center">
          <button className={`px-3 py-1 rounded-md ${tab === "general" ? "bg-indigo-600 text-white" : "bg-white/3 text-white/80"}`} onClick={() => setTab("general")}>
            General
          </button>
          <button className={`px-3 py-1 rounded-md ${tab === "billing" ? "bg-indigo-600 text-white" : "bg-white/3 text-white/80"}`} onClick={() => setTab("billing")}>
            Billing
          </button>
          <button className={`px-3 py-1 rounded-md ${tab === "defaults" ? "bg-indigo-600 text-white" : "bg-white/3 text-white/80"}`} onClick={() => setTab("defaults")}>
            Defaults
          </button>
          <button className={`px-3 py-1 rounded-md ${tab === "raw" ? "bg-indigo-600 text-white" : "bg-white/3 text-white/80"}`} onClick={() => setTab("raw")}>
            Raw JSON
          </button>
          <button className={`px-3 py-1 rounded-md ${tab === "history" ? "bg-indigo-600 text-white" : "bg-white/3 text-white/80"}`} onClick={() => setTab("history")}>
            History
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="import-json"
            type="file"
            accept="application/json"
            onChange={(e) => importJson(e.target.files ? e.target.files[0] : null)}
            className="hidden"
          />
          <label htmlFor="import-json" className="px-3 py-2 rounded-md bg-white/5 border border-white/10 cursor-pointer text-sm">Import</label>

          <button onClick={exportJson} className="px-3 py-2 rounded-md bg-white/6 border border-white/10 text-sm">Export</button>

          <button onClick={resetToServer} className="px-3 py-2 rounded-md bg-white/6 border border-white/10 text-sm">Reset</button>

          <button
            onClick={async () => {
              const v = validate(settings);
              if (v) {
                setError(v);
                return;
              }
              await doSave(settings, { force: true });
            }}
            disabled={saving}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow"
          >
            {saving ? "Saving…" : "Save Now"}
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-rose-400">{error}</div>}

      <div className="bg-white/3 border border-white/8 rounded-xl p-6">
        {loading ? (
          <div className="text-white/60">Loading…</div>
        ) : tab === "general" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-white/70">Tenant name</label>
              <input className="w-full p-3 rounded-lg bg-white/5 border border-white/8 text-white" value={settings.tenant_name} onChange={(e) => updateField({ tenant_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white/70">Address</label>
              <input className="w-full p-3 rounded-lg bg-white/5 border border-white/8 text-white" value={settings.address ?? ""} onChange={(e) => updateField({ address: e.target.value })} />
            </div>
          </div>
        ) : tab === "billing" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-white/70">Currency</label>
              <select className="w-full p-3 rounded-lg bg-white/5 border border-white/8 text-white" value={settings.currency} onChange={(e) => updateField({ currency: e.target.value })}>
                <option>USD</option>
                <option>INR</option>
                <option>EUR</option>
                <option>AED</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white/70">Tax rate (%)</label>
              <input type="number" className="w-full p-3 rounded-lg bg-white/5 border border-white/8 text-white" value={Number(settings.tax_rate)} onChange={(e) => updateField({ tax_rate: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white/70">Timezone</label>
              <select className="w-full p-3 rounded-lg bg-white/5 border border-white/8 text-white" value={settings.timezone} onChange={(e) => updateField({ timezone: e.target.value })}>
                <option>UTC</option>
                <option>Asia/Kolkata</option>
                <option>Asia/Dubai</option>
                <option>Europe/London</option>
              </select>
            </div>
          </div>
        ) : tab === "defaults" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-white/70">Default patient type</label>
              <select value={settings.default_patient_type} onChange={(e) => updateField({ default_patient_type: e.target.value })} className="w-full p-3 rounded-lg bg-white/5 border border-white/8 text-white">
                <option value="CASH">CASH</option>
                <option value="INSURANCE">INSURANCE</option>
                <option value="GOVT">GOVT</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/70">Metadata (custom JSON)</label>
              <textarea value={JSON.stringify(settings.metadata ?? {}, null, 2)} onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value || "{}");
                  updateField({ metadata: parsed }, false);
                  setError(null);
                } catch {
                  setError("Invalid JSON in metadata");
                }
              }} className="w-full p-3 rounded-lg bg-white/5 border border-white/8 text-white font-mono text-sm h-28" />
            </div>
          </div>
        ) : tab === "raw" ? (
          <div className="space-y-3">
            <label className="text-sm text-white/70">Raw settings (JSON)</label>
            <textarea value={rawJsonText} onChange={(e) => setRawJsonText(e.target.value)} className="w-full p-3 rounded-lg bg-black/6 border border-white/8 text-white font-mono text-sm h-64" />
            <div className="flex gap-2">
              <button onClick={applyRawJson} className="px-4 py-2 rounded-md bg-indigo-600 text-white">Apply JSON</button>
              <button onClick={() => { setRawJsonText(JSON.stringify(settings, null, 2)); }} className="px-4 py-2 rounded-md bg-white/5">Revert to UI</button>
            </div>
            <div className="text-xs text-white/50 mt-2">
              Raw JSON edits are powerful — they update the full settings object. The UI will validate common fields. Backend will still validate schema and may reject invalid shapes.
            </div>
          </div>
        ) : (
          <div>{renderHistory}</div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-white/50">Server version: {serverVersion ?? "—"}</div>
        <div className="flex items-center gap-3 text-sm">
          <button onClick={() => { setSettings((s) => ({ ...s })); resetToServer(); }} className="px-3 py-2 rounded-md bg-white/5 border border-white/10">Reload</button>
          <button onClick={() => { exportJson(); }} className="px-3 py-2 rounded-md bg-white/6 border border-white/10">Export JSON</button>
        </div>
      </div>
    </div>
  );
}
