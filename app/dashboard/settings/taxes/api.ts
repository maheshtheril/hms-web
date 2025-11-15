// web/app/dashboard/settings/taxes/api.ts
"use client";

import type { TaxRateRow } from "./types";
import type { TaxRateInputType } from "./schema";

const jsonOrThrow = async (res: Response) => {
  const txt = await res.text();
  if (!res.ok) throw new Error(txt || res.statusText);
  try { return JSON.parse(txt); } catch { return txt; }
};

export const TaxesAPI = {
  async listTenant(tenantId?: string): Promise<TaxRateRow[]> {
    const res = await fetch("/api/tenant/tax-rates", {
      credentials: "include",
      headers: tenantId ? { "x-tenant-id": tenantId } : {},
    });
    return jsonOrThrow(res);
  },

  async upsertTenant(payload: TaxRateInputType, tenantId?: string): Promise<TaxRateRow> {
    const res = await fetch("/api/tenant/tax-rates", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(tenantId ? { "x-tenant-id": tenantId } : {}) },
      body: JSON.stringify(payload),
    });
    return jsonOrThrow(res);
  },

  async upsertCompany(companyId: string, payload: TaxRateInputType, tenantId?: string): Promise<TaxRateRow> {
    const res = await fetch(`/api/company/${companyId}/tax-rates`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(tenantId ? { "x-tenant-id": tenantId } : {}) },
      body: JSON.stringify(payload),
    });
    return jsonOrThrow(res);
  },

  async listEffective(companyId: string, tenantId?: string, country?: string): Promise<TaxRateRow[]> {
    const q = new URLSearchParams();
    if (country) q.set("country", country);
    const res = await fetch(`/api/company/${companyId}/effective-tax-rates?${q.toString()}`, {
      credentials: "include",
      headers: tenantId ? { "x-tenant-id": tenantId } : {},
    });
    return jsonOrThrow(res);
  },
};
