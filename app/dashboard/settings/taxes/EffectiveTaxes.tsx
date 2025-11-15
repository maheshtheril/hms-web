// web/app/dashboard/settings/taxes/EffectiveTaxes.tsx
"use client";

import React, { useEffect, useState } from "react";
import { TaxesAPI } from "./api";
import type { TaxRateRow } from "./types";

type Props = {
  companyId: string;
  tenantId?: string | null;
};

export default function EffectiveTaxes({ companyId, tenantId }: Props): JSX.Element {
  const [data, setData] = useState<TaxRateRow[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErr(null);

    TaxesAPI.listEffective(companyId, tenantId ?? undefined)
      .then((rows: any) => {
        if (!mounted) return;
        setData(Array.isArray(rows) ? rows : (rows ? [rows] : []));
      })
      .catch((e: any) => {
        if (!mounted) return;
        setErr(String(e?.message ?? e));
        setData(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [companyId, tenantId]);

  if (loading) return <p className="text-white/70">Loading effective taxes…</p>;
  if (err) return <p className="text-red-400">Error: {err}</p>;
  if (!data || data.length === 0) return <p className="text-white/70">No effective taxes found.</p>;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {data.map((t) => (
        <div key={t.id} className="p-4 rounded-2xl bg-white/8 border border-white/10">
          <h4 className="text-white font-semibold">{t.name} <span className="text-white/60 text-sm">({t.type})</span></h4>
          <p className="text-white/70">Rate: {(t.rate * 100).toFixed(2)}%</p>
          <p className="text-white/60 text-xs">{t.country ?? "—"} {t.state ? `· ${t.state}` : ""} {t.city ? `· ${t.city}` : ""}</p>
          <p className="text-white/60 text-xs mt-1">{t.company_id ? "Company override" : t.tenant_id ? "Tenant default" : "Global default"}</p>
        </div>
      ))}
    </div>
  );
}
