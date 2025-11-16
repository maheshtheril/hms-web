// web/app/dashboard/settings/taxes/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TaxesAPI } from "./api";
import TaxList from "./TaxList";
import TaxEditor from "./TaxEditor";
import EffectiveTaxes from "./EffectiveTaxes";
import { CompaniesAPI } from "./apiCompanies";
import { TaxTypesAPI } from "./apiTaxTypes";
import type { TaxRateRow } from "./types";

type Mode = "organization" | "effective";

/**
 * Final TaxesPage
 * - Uses window.__SESSION as canonical session source (tenantId, companyId)
 * - Uses react-query (v5) object-style useQuery signatures
 * - Supports organization defaults (tenant-level) and company effective taxes
 */
export default function TaxesPage(): JSX.Element {
  // session-derived identifiers
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // UI state
  const [mode, setMode] = useState<Mode>("organization");
  const [editorData, setEditorData] = useState<Partial<TaxRateRow> | null>(null);

  const qc = useQueryClient();

  // Read session once on mount
  useEffect(() => {
    const s = (window as any).__SESSION;
    const tid = s?.tenantId ?? null;
    const cid = s?.companyId ?? null;

    setTenantId(tid);
    setSelectedCompanyId(cid);
  }, []);

  // Companies list for tenant
  const {
    data: companies = [],
    isLoading: companiesLoading,
    error: companiesError,
  } = useQuery({
    queryKey: ["companies", tenantId],
    queryFn: async (): Promise<Array<{ id: string; name: string }>> => {
      if (!tenantId) return [];
      const rows = await CompaniesAPI.list(tenantId);
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5,
  });

  // Tax types (master) for tenant
  const {
    data: taxTypes = [],
    isLoading: taxTypesLoading,
    error: taxTypesError,
  } = useQuery({
    queryKey: ["taxTypes", tenantId],
    queryFn: async (): Promise<Array<{ id: string; name: string; code: string }>> => {
      if (!tenantId) return [];
      const rows = await TaxTypesAPI.list(tenantId);
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5,
  });

  // Organization defaults (tenant-level tax rates)
  const {
    data: organizationTaxes = [],
    isLoading: orgTaxesLoading,
    error: orgTaxesError,
    refetch: refetchOrgTaxes,
  } = useQuery({
    queryKey: ["tenantTaxes", tenantId],
    queryFn: async (): Promise<TaxRateRow[]> => {
      if (!tenantId) return [];
      const rows = await TaxesAPI.listTenant(tenantId as string);
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 2,
  });

  const organizationList = useMemo(
    () => (Array.isArray(organizationTaxes) ? organizationTaxes : []),
    [organizationTaxes]
  );

  // Reload helper: invalidate only relevant queries
  async function reloadAll(): Promise<void> {
    if (tenantId) qc.invalidateQueries({ queryKey: ["tenantTaxes", tenantId] });
    if (selectedCompanyId) qc.invalidateQueries({ queryKey: ["effectiveTaxes", selectedCompanyId] });

    await refetchOrgTaxes();
  }

  // Editor helpers
  function openEditorForNewOrganization() {
    setEditorData({ company_id: null });
  }

  function openEditorForNewCompany(companyId?: string | null) {
    setEditorData({ company_id: companyId ?? null });
  }

  // Combined loading/error flags
  const anyLoading = companiesLoading || taxTypesLoading || orgTaxesLoading;
  const anyError = companiesError || taxTypesError || orgTaxesError;

  return (
    <div className="p-6 space-y-6">
      {/* Top controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-white/80">Company</label>
          <select
            value={selectedCompanyId ?? ""}
            onChange={(e) => setSelectedCompanyId(e.target.value || null)}
            className="p-2 rounded-lg bg-black/30 text-white border border-white/20"
          >
            <option value="">— Organization defaults —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setMode("organization")}
          className={`px-4 py-2 rounded-xl ${
            mode === "organization" ? "ring-2 ring-blue-400" : "bg-white/5"
          }`}
        >
          Organization defaults
        </button>

        <button
          onClick={() => setMode("effective")}
          className={`px-4 py-2 rounded-xl ${
            mode === "effective" ? "ring-2 ring-blue-400" : "bg-white/5"
          }`}
          disabled={!selectedCompanyId}
        >
          Company effective taxes
        </button>

        <div className="ml-auto flex gap-2">
          <button
            onClick={openEditorForNewOrganization}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl"
            disabled={!tenantId}
          >
            + Add Organization Default
          </button>

          <button
            onClick={() => openEditorForNewCompany(selectedCompanyId)}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl"
            disabled={!selectedCompanyId}
          >
            + Add Company Override
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/70">
          {anyLoading
            ? "Loading..."
            : anyError
            ? "Some data failed to load"
            : "Ready"}
        </div>

        <div className="text-sm text-white/60">
          Tenant: <span className="font-medium">{tenantId ?? "null"}</span>
          {selectedCompanyId && (
            <span className="ml-4">
              Company: <span className="font-medium">{selectedCompanyId}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      {mode === "organization" && (
        <TaxList
          list={organizationList}
          loading={orgTaxesLoading}
          onEdit={(row) => setEditorData(row)}
        />
      )}

      {mode === "effective" && selectedCompanyId && (
        <EffectiveTaxes
          companyId={selectedCompanyId}
          tenantId={tenantId ?? undefined}
        />
      )}

      {/* Editor Modal */}
      {editorData && (
        <TaxEditor
          initial={editorData}
          tenantId={tenantId}
          companyId={editorData.company_id ?? selectedCompanyId ?? null}
          taxTypes={taxTypes}
          companies={companies}
          onSaved={reloadAll}
          onClose={() => setEditorData(null)}
        />
      )}
    </div>
  );
}
