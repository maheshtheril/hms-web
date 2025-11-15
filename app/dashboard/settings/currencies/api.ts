// web/app/dashboard/settings/currencies/api.ts
"use client";

export const CurrenciesAPI = {
  async listTenant(tenantId?: string) {
    const res = await fetch(`/api/tenant/currencies`, {
      credentials: "include",
      headers: tenantId ? { "x-tenant-id": tenantId } : {}
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async listEffective(companyId: string, tenantId?: string) {
    const url = `/api/company/${companyId}/effective-currency?code=ALL`;
    const res = await fetch(url, {
      credentials: "include",
      headers: tenantId ? { "x-tenant-id": tenantId } : {}
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async upsertTenant(payload: any, tenantId?: string) {
    const res = await fetch(`/api/tenant/currencies`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(tenantId ? { "x-tenant-id": tenantId } : {})
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async upsertCompany(companyId: string, payload: any, tenantId?: string) {
    const res = await fetch(`/api/company/${companyId}/currencies`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(tenantId ? { "x-tenant-id": tenantId } : {})
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};
