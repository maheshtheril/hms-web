// web/app/dashboard/settings/taxes/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { TaxesAPI } from "./api";
import TaxList from "./TaxList";
import TaxEditor from "./TaxEditor";
import EffectiveTaxes from "./EffectiveTaxes";
import { useQueryClient } from "@tanstack/react-query";
import type { TaxRateRow } from "./types";

type Mode = "tenant" | "effective";

export default function TaxesPage(): JSX.Element {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("tenant");
  const [list, setList] = useState<TaxRateRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editorData, setEditorData] = useState<Partial<TaxRateRow> | null>(null);

  const qc = useQueryClient();

  useEffect(() => {
    const session = (window as any).__SESSION;
    setTenantId(session?.tenantId ?? null);
    setCompanyId(session?.companyId ?? null);
  }, []);

  async function load(): Promise<void> {
    if (!tenantId) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await TaxesAPI.listTenant(tenantId);
      setList(rows);
    } catch (err) {
      console.error("Failed loading tenant taxes", err);
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function reload(): Promise<void> {
    // optionally invalidate react-query caches if you use them elsewhere
    qc.invalidateQueries();
    await load();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMode("tenant")}
          className={`px-4 py-2 rounded-xl ${mode === "tenant" ? "ring-2 ring-blue-400" : "bg-white/5"}`}
        >
          Tenant Taxes
        </button>

        {companyId && (
          <button
            onClick={() => setMode("effective")}
            className={`px-4 py-2 rounded-xl ${mode === "effective" ? "ring-2 ring-blue-400" : "bg-white/5"}`}
          >
            Effective (Company)
          </button>
        )}

        <button
          onClick={() => setEditorData({})}
          className="ml-auto px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl"
        >
          + Add Tax
        </button>
      </div>

      {mode === "tenant" && (
        <TaxList list={list} loading={loading} onEdit={(row) => setEditorData(row)} />
      )}

      {mode === "effective" && companyId && (
        <EffectiveTaxes companyId={companyId} tenantId={tenantId} />
      )}

      {editorData && (
        <TaxEditor
          initial={editorData}
          tenantId={tenantId}
          companyId={companyId}
          onSaved={reload}
          onClose={() => setEditorData(null)}
        />
      )}
    </div>
  );
}
