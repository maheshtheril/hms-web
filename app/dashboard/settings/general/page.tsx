// web/app/dashboard/settings/general/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import CategoryTabs from "../components/CategoryTabs";
import SettingCard from "../components/SettingCard";
import SettingForm from "../components/SettingForm";
import { SettingsAPI, categorize } from "../services/settings.api";

type SettingRow = {
  id: string;
  key: string;
  value: any;
  scope: string;
  tenant_id?: string | null;
  company_id?: string | null;
  version?: number;
};

export default function SettingsApp() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await SettingsAPI.list();
      setSettings(Array.isArray(data) ? data : []);
    } catch (e: any) {
      // surface error for the UI and console so you can inspect network/stacktrace
      const msg = e?.message || String(e) || "Unknown error";
      console.error("SettingsAPI.list() failed:", e);
      setError(msg);
      setSettings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // compute categories from current settings
  const categories = useMemo(() => categorize(settings || []), [settings]);

  // When categories change, pick a sensible active category if none set or current not present
  useEffect(() => {
    const keys = Object.keys(categories);
    if (!keys.length) {
      // no categories yet (empty result) — clear active
      setActiveCategory(null);
      return;
    }
    if (!activeCategory || !keys.includes(activeCategory)) {
      setActiveCategory(keys[0]); // pick the first category available
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  // helpful debug/log UI for when things are missing
  if (loading) {
    return <div className="p-6">Loading settings…</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 font-medium">Failed to load settings</div>
        <pre className="mt-2 bg-gray-50 p-3 rounded text-sm overflow-auto">{error}</pre>
        <button
          className="mt-3 px-3 py-1 border rounded"
          onClick={() => load()}
        >
          Retry
        </button>
      </div>
    );
  }

  const categoryKeys = Object.keys(categories);
  if (!categoryKeys.length) {
    return (
      <div className="p-6">
        <div className="text-yellow-700">No settings found.</div>
        <div className="mt-2 text-sm text-gray-600">
          The settings API returned an empty list. Check the network tab for <code>/api/settings</code> or your SettingsAPI implementation.
        </div>
        <button className="mt-3 px-3 py-1 border rounded" onClick={() => load()}>
          Reload
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <CategoryTabs
        categories={categoryKeys}
        active={activeCategory || categoryKeys[0]}
        onChange={setActiveCategory as (c: string) => void}
      />

      <div className="mt-6">
        <div className="text-sm text-gray-500 mb-4">
          Showing category: <strong>{activeCategory}</strong>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {(categories[activeCategory || categoryKeys[0]] || []).map((s: SettingRow) => (
            <SettingCard
              key={s.id}
              title={s.key}
              subtitle={`scope: ${s.scope} • v${s.version || 1}`}
            >
              <SettingForm
                setting={s}
                saving={savingKey === s.key}
                onSave={async (value: SettingRow["value"]) => {
                  setSavingKey(s.key);
                  setError(null);
                  try {
                    await SettingsAPI.update({
                      key: s.key,
                      value,
                      tenant_id: s.tenant_id,
                      company_id: s.company_id,
                    });
                    await load();
                  } catch (e: any) {
                    console.error("SettingsAPI.update failed:", e);
                    setError(String(e?.message || e));
                  } finally {
                    setSavingKey(null);
                  }
                }}
              />
            </SettingCard>
          ))}
        </div>
      </div>
    </div>
  );
}
