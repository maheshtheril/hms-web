// web/app/dashboard/settings/settings-app.tsx
"use client";

import { useEffect, useState } from "react";
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
  const [activeCategory, setActiveCategory] = useState<string>("Billing");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await SettingsAPI.list();
      setSettings(data);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const categories = categorize(settings);

  return (
    <div>
      <CategoryTabs
        categories={Object.keys(categories)}
        active={activeCategory}
        onChange={setActiveCategory}
      />

      {loading && <div className="mt-6">Loading settings…</div>}
      {error && <div className="text-red-500 mt-4">{error}</div>}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {(categories[activeCategory] || []).map((s) => (
          <SettingCard key={s.id} title={s.key} subtitle={`scope: ${s.scope} • v${s.version || 1}`}>
            <SettingForm
              setting={s}
              saving={savingKey === s.key}
              onSave={async (value: SettingRow["value"]) => {
                setSavingKey(s.key);
                setError(null);
                try {
                  await SettingsAPI.update({ key: s.key, value, tenant_id: s.tenant_id, company_id: s.company_id });
                  await load();
                } catch (e: any) {
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
  );
}
