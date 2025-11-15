// web/app/dashboard/settings/taxes/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { TaxesAPI } from "./api";
import TaxList from "./TaxList";
import TaxEditor from "./TaxEditor";
import EffectiveTaxes from "./EffectiveTaxes";
import { useQueryClient } from "@tanstack/react-query";
import type { TaxRateRow } from "./types";
import { CompaniesAPI } from "./apiCompanies";
import { TaxTypesAPI } from "./apiTaxTypes";

type Mode = "tenant" | "effective";

export default function TaxesPage(): JSX.Element {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null); // currently selected company in header
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [taxTypes, setTaxTypes] = useState<Array<{ id: string; name: string; code: string }>>([]);

  const [mode, setMode] = useState<Mode>("tenant");
  const [list, setList] = useState<TaxRateRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editorData, setEditorData] = useState<Partial<TaxRateRow> | null>(null);

  const qc = useQueryClient();

  // init session, companies, tax types
  useEffect(() => {
    const s = (window as any).__SESSION;
    const t = s?.tenantId ?? null;
    const c = s?.companyId ?? null;
    setTenantId(t);
    setCompanyId(c);

    if (t) {
      void CompaniesAPI.list(t)
        .then((rows) => setCompanies(Array.isArray(rows) ? rows : []))
        .catch((err) => {
          console.error("Failed to load companies", err);
          setCompanies([]);
        });

      void TaxTypesAPI.list(t)
        .then((rows) => setTaxTypes(Array.isArray(rows) ? rows : []))
        .catch((err) => {
          console.error("Failed to load tax types", err);
          setTaxTypes([]);
        });
    }
  }, []);

  async function load(): Promise<void> {
    if (!tenantId) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await TaxesAPI.listTenant(tenantId ?? undefined);
      setList(Array.isArray(rows) ? rows : []);
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
    // target only tax-related caches; use filter object to satisfy TS
    if (tenantId) qc.invalidateQueries({ queryKey: ["tenantTaxes", tenantId] });
    if (companyId) qc.invalidateQueries({ queryKey: ["effectiveTaxes", companyId] });
    await load();
  }

  // open editor in a scoped way: if company param passed, editor should consider company override
  function openEditorForNew(scopeCompanyId?: string | null) {
    // pass an empty object but carry desired companyId
    setEditorData({ company_id: scopeCompanyId ?? null });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Top controls: company selector + mode toggle */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-white/80">Company</label>
          <select
            value={companyId ?? ""}
            onChange={(e) => setCompanyId(e.target.value || null)}
            className="p-2 rounded-lg bg-black/30 text-white border border-white/20"
          >
            <option value="">— Tenant default —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setMode("tenant")}
          className={`px-4 py-2 rounded-xl ${mode === "tenant" ? "ring-2 ring-blue-400" : "bg-white/5"}`}
        >
          Tenant Taxes
        </button>

        <button
          onClick={() => setMode("effective")}
          className={`px-4 py-2 rounded-xl ${mode === "effective" ? "ring-2 ring-blue-400" : "bg-white/5"}`}
          disabled={!companyId}
        >
          Effective (Company)
        </button>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => openEditorForNew(null)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl"
          >
            + Add Tenant Tax
          </button>

          <button
            onClick={() => openEditorForNew(companyId ?? null)}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl"
            disabled={!companyId}
            title={companyId ? "Add tax override for selected company" : "Select a company first"}
          >
            + Add Company Tax
          </button>
        </div>
      </div>

      {/* List / Effective UI */}
      {mode === "tenant" && <TaxList list={list} loading={loading} onEdit={(row) => setEditorData(row)} />}

      {mode === "effective" && companyId && <EffectiveTaxes companyId={companyId} tenantId={tenantId ?? undefined} />}

      {/* Editor */}
      {editorData && (
        <TaxEditor
          initial={editorData}
          tenantId={tenantId}
          companyId={editorData.company_id ?? companyId ?? null}
          taxTypes={taxTypes}
          companies={companies}
          onSaved={reload}
          onClose={() => setEditorData(null)}
        />
      )}
    </div>
  );
}
