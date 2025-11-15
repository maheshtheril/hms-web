// web/app/dashboard/settings/currencies/page.tsx
"use client";

import { useEffect, useState } from "react";
import { CurrenciesAPI } from "./api";
import CurrencyList from "./CurrencyList";
import CurrencyEditor from "./CurrencyEditor";
import EffectiveCurrency from "./EffectiveCurrency";

export default function CurrenciesSettingsPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currencies, setCurrencies] = useState([]);
  const [editorData, setEditorData] = useState<any | null>(null);
  const [tab, setTab] = useState<"tenant" | "effective">("tenant");

  useEffect(() => {
    const s = (window as any).__SESSION;
    setTenantId(s?.tenantId || null);
    setCompanyId(s?.companyId || null);
  }, []);

  async function load() {
    if (!tenantId) return;
    setLoading(true);
    const list = await CurrenciesAPI.listTenant(tenantId);
    setCurrencies(list);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [tenantId]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-4">
        <button
          onClick={() => setTab("tenant")}
          className={`px-4 py-2 rounded-xl backdrop-blur-lg bg-white/10 text-white ${
            tab === "tenant" ? "ring-2 ring-blue-400" : ""
          }`}
        >
          Tenant Currencies
        </button>

        {companyId && (
          <button
            onClick={() => setTab("effective")}
            className={`px-4 py-2 rounded-xl backdrop-blur-lg bg-white/10 text-white ${
              tab === "effective" ? "ring-2 ring-blue-400" : ""
            }`}
          >
            Effective (Company)
          </button>
        )}

        <button
          onClick={() => setEditorData({})}
          className="ml-auto px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl"
        >
          + Add Currency
        </button>
      </div>

      {tab === "tenant" && (
        <CurrencyList
          loading={loading}
          list={currencies}
          onEdit={(item) => setEditorData(item)}
        />
      )}

      {tab === "effective" && companyId && (
        <EffectiveCurrency companyId={companyId} tenantId={tenantId} />
      )}

      {editorData && (
        <CurrencyEditor
          initial={editorData}
          tenantId={tenantId}
          companyId={companyId}
          onClose={() => {
            setEditorData(null);
            load();
          }}
        />
      )}
    </div>
  );
}
