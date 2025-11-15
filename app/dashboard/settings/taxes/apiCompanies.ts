// web/app/dashboard/settings/taxes/apiCompanies.ts
"use client";

export const CompaniesAPI = {
  async list(tenantId?: string) {
    const res = await fetch("/api/hms/companies", {
      credentials: "include",
      headers: tenantId ? { "x-tenant-id": tenantId } : {},
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
