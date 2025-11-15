// web/app/dashboard/settings/settings-app.tsx
"use client";

import React, { useEffect, useState } from "react";
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

function getTenantFromWindowOrStorage(): string | null {
  try {
    // 1. window.__SESSION
    if (typeof window !== "undefined" && window.__SESSION && window.__SESSION.tenantId) {
      return String(window.__SESSION.tenantId);
    }

    // 2. meta tag
    if (typeof document !== "undefined") {
      const meta = document.querySelector('meta[name="tenant-id"]');
      if (meta && meta.getAttribute) {
        const v = meta.getAttribute("content");
        if (v) return v;
      }
    }

    // 3. localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      const v = localStorage.getItem("tenant_id") || localStorage.getItem("tenantId");
      if (v) return v;
    }

    // 4. cookie
    if (typeof document !== "undefined" && document.cookie) {
      const match = document.cookie.match(/(?:^|;\s*)tenant_id=([^;]+)/);
      if (match) return decodeURIComponent(match[1]);
    }
  } catch (e) {
    // ignore and return null
  }
  return null;
}

function getCompanyFromWindowOrStorage(): string | null {
  try {
    if (typeof window !== "undefined" && window.__SESSION && window.__SESSION.companyId) {
      return String(window.__SESSION.companyId);
    }

    if (typeof document !== "undefined") {
      const meta = document.querySelector('meta[name="company-id"]');
      if (meta && meta.getAttribute) {
        const v = meta.getAttribute("content");
        if (v) return v;
      }
    }

    if (typeof window !== "undefined" && window.localStorage) {
      const v = localStorage.getItem("company_id") || localStorage.getItem("companyId");
      if (v) return v;
    }

    if (typeof document !== "undefined" && document.cookie) {
      const match = document.cookie.match(/(?:^|;\s*)company_id=([^;]+)/);
      if (match) return decodeURIComponent(match[1]);
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export default function SettingsApp() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // try to infer tenant/company for fallback calls
  const tenantId = typeof window !== "undefined" ? getTenantFromWindowOrStorage() : null;
  const companyId = typeof window !== "undefined" ? getCompanyFromWindowOrStorage() : null;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Primary fetch
      const data = await SettingsAPI.list();
      // Defensive: ensure it's an array
      const arr = Array.isArray(data) ? data : [];
      // If empty, attempt to fetch at least a meaningful fallback (ui.brand.name effective value)
      if (arr.length === 0) {
        try {
          const eff = await SettingsAPI.effective("ui.brand.name", companyId || undefined);
          if (eff && eff.value) {
            // craft a minimal SettingRow from effective response
            const fallbackRow: SettingRow = {
              id: `fallback-ui-brand-${tenantId || "global"}`,
              key: "ui.brand.name",
              value: eff.value,
              scope: tenantId ? "tenant" : "global",
              tenant_id: tenantId ?? null,
              company_id: companyId ?? null,
              version: 1,
            };
            setSettings([fallbackRow]);
            // set active category to the fallback row's category (below)
            setActiveCategory((prev) => prev ?? Object.keys(categorize([fallbackRow]))[0] ?? "General");
            setLoading(false);
            return;
          }
        } catch (e) {
          // ignore fallback errors — we'll still show empty UI (but below we guard)
          console.warn("settings: effective fallback failed:", e);
        }
      }
      setSettings(arr);
      // if no activeCategory chosen yet, pick the first available category
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

  const categoriesMap = categorize(settings);
  const categories = Object.keys(categoriesMap);
  const effectiveActiveCategory = activeCategory ?? (categories.length ? categories[0] : "General");

  // render safeDefaults if settings was empty (so UI never blank)
  const safeList = (settings && settings.length) ? settings : [{ id: "fallback-default", key: "ui.brand.name", value: { label: "HMS" }, scope: "global" }];

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
