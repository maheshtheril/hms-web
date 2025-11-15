// web/app/dashboard/settings/currencies/EffectiveCurrency.tsx
"use client";

import React, { useEffect, useState } from "react";
import type { CurrencyRow } from "./types";
import { CurrenciesAPI } from "./api";

type Props = {
  companyId: string;
  tenantId?: string | null;
};

export default function EffectiveCurrency({ companyId, tenantId }: Props) {
  const [data, setData] = useState<CurrencyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    CurrenciesAPI.listEffective(companyId, tenantId ?? undefined)
      .then((res) => setData(res ?? null))
      .catch((e) => setErr(String(e?.message || e)))
      .finally(() => setLoading(false));
  }, [companyId, tenantId]);

  if (loading) return <p className="text-white/70">Loading effective currency…</p>;
  if (err) return <p className="text-red-400">{err}</p>;
  if (!data) return <p className="text-white/70">No effective currency found.</p>;

  return (
    <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white">
      <h3 className="text-xl font-semibold mb-2">Effective Currency</h3>
      <p><strong>Code:</strong> {data.code}</p>
      <p><strong>Symbol:</strong> {data.symbol}</p>
      <p><strong>Precision:</strong> {data.precision}</p>
      <p><strong>Locale:</strong> {data.locale ?? "—"}</p>
      <p className="text-white/60 text-xs mt-2">{data.company_id ? "Company override" : data.tenant_id ? "Tenant default" : "Global default"}</p>
    </div>
  );
}
