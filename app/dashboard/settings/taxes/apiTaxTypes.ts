// apiTaxTypes.ts
"use client";

export const TaxTypesAPI = {
  async list(tenantId?: string) {
    const res = await fetch("/api/tenant/tax-types", {
      headers: tenantId ? { "x-tenant-id": tenantId } : {},
      credentials: "include",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async create(payload: any, tenantId?: string) {
    const res = await fetch("/api/tenant/tax-types", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(tenantId ? { "x-tenant-id": tenantId } : {}),
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async update(id: string, payload: any, tenantId?: string) {
    const res = await fetch(`/api/tenant/tax-types/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(tenantId ? { "x-tenant-id": tenantId } : {}),
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async remove(id: string, tenantId?: string) {
    const res = await fetch(`/api/tenant/tax-types/${id}`, {
      method: "DELETE",
      headers: tenantId ? { "x-tenant-id": tenantId } : {},
      credentials: "include",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
