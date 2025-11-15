"use client";

import React, { useEffect, useMemo, useState } from "react";
import CategoryTabs from "./components/CategoryTabs";
import SettingCard from "./components/SettingCard";
import SettingForm from "./components/SettingForm";
import { SettingsAPI, categorize } from "./services/settings.api";

type SettingRow = {
  id: string;
  key: string;
  value: any;
  scope: string;
  tenant_id?: string | null;
  company_id?: string | null;
  version?: number;
};

/**
 * Type-safe declaration for a possible global session object.
 * This prevents TS errors when reading window.__SESSION in client code.
 */
declare global {
  interface Window {
    __SESSION?: {
      userId?: string;
      tenantId?: string;
      companyId?: string;
      [k: string]: any;
    };
  }
}

export default function SettingsApp() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * NOTE: Do NOT read localStorage or cookies here.
   * The SettingsAPI will include tenant/user headers using the server/session surface.
   * If you absolutely need tenant/company in the UI, read them from window.__SESSION only.
   */

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await SettingsAPI.list();
      const arr = Array.isArray(data) ? data : [];

      // If backend returned nothing meaningful, try an "effective" fallback
      if (arr.length === 0) {
        try {
          // Let server resolve company context - do not pass client-side guessed ids.
          const eff = await SettingsAPI.effective("ui.brand.name");
          if (eff && eff.value) {
            const fallbackRow: SettingRow = {
              id: `fallback-ui-brand`,
              key: "ui.brand.name",
              value: eff.value,
              scope: eff.scope ?? "global",
              tenant_id: eff.tenant_id ?? null,
              company_id: eff.company_id ?? null,
              version: 1,
            };
            setSettings([fallbackRow]);
            setActiveCategory((prev) => prev ?? Object.keys(categorize([fallbackRow]))[0] ?? "General");
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn("settings: effective fallback failed:", e);
        }
      }

      setSettings(arr);
      const cats = Object.keys(categorize(arr));
      if (!activeCategory && cats.length > 0) {
        setActiveCategory(cats[0]);
      }
    } catch (e: any) {
      console.error("Failed to load settings", e);
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Memoize categories map
  const categoriesMap = useMemo(() => categorize(settings), [settings]);
  const categories = Object.keys(categoriesMap);
  const effectiveActiveCategory = activeCategory ?? (categories.length ? categories[0] : "General");

  // safeList ensures UI never blank
  const safeList =
    settings && settings.length
      ? settings
      : [{ id: "fallback-default", key: "ui.brand.name", value: { label: "HMS" }, scope: "global" }];

  return (
    <div>
      <CategoryTabs
        categories={Object.keys(categoriesMap).length ? Object.keys(categoriesMap) : ["General"]}
        active={effectiveActiveCategory}
        onChange={setActiveCategory as (c: string) => void}
      />

      {loading && <div className="mt-6">Loading settings…</div>}
      {error && <div className="text-red-500 mt-4">{error}</div>}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {(categoriesMap[effectiveActiveCategory] || safeList).map((s) => (
          <SettingCard key={s.id} title={s.key} subtitle={`scope: ${s.scope} • v${s.version || 1}`}>
            <SettingForm
              setting={s}
              saving={savingKey === s.key}
              onSave={async (value: SettingRow["value"]) => {
                setSavingKey(s.key);
                setError(null);
                try {
                  // Let backend determine tenant/company from session headers.
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
