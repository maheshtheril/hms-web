"use client";

import React, { useEffect, useState } from "react";
import KPIGrid from "./KPIGrid";
import { Company } from "@/types/company";

/**
 * Safer client-side backend resolution:
 * - prefer NEXT_PUBLIC_BACKEND_URL if set and absolute
 * - otherwise use relative same-origin endpoints
 */
const RAW_BACKEND =
  (process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    "").trim();

const BACKEND = RAW_BACKEND ? RAW_BACKEND.replace(/\/+$/, "") : "";

function buildDashboardUrl(companyId: string) {
  // prefer absolute backend if provided, otherwise relative path
  if (BACKEND) return `${BACKEND}/api/company/dashboard?company_id=${encodeURIComponent(companyId)}`;
  return `/api/company/dashboard?company_id=${encodeURIComponent(companyId)}`;
}

export default function EnterpriseDashboard({ company }: { company: Company }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!company?.id) return;
    const controller = new AbortController();
    const signal = controller.signal;

    (async () => {
      try {
        const url = buildDashboardUrl(company.id);
        // Helpful debug: shows exactly what origin the client is calling
        console.debug("[EnterpriseDashboard] fetching:", url, " BACKEND:", BACKEND || "(relative)");

        const res = await fetch(url, {
          credentials: "include",
          headers: { Accept: "application/json" },
          signal,
        });

        if (!res.ok) {
          console.error("EnterpriseDashboard failed:", res.status, await res.text().catch(() => "<no body>"));
          setData({});
          return;
        }

        const json = await res.json().catch(() => ({}));
        setData(json);
      } catch (err: any) {
        if (err?.name === "AbortError") {
          // fetch canceled on unmount — ignore
          return;
        }
        console.error("EnterpriseDashboard error:", err);
        setData({});
      }
    })();

    return () => controller.abort();
  }, [company?.id]);

  const kpis = [
    { id: "companies", title: "Companies", value: data?.companies_count ?? 0 },
    { id: "employees", title: "Employees", value: data?.employee_count ?? 0 },
    { id: "revenue_30d", title: "Revenue (30d)", value: data?.revenue_30d ?? "—" },
    { id: "open_invoices", title: "Open Invoices", value: data?.open_invoices ?? 0 },
    { id: "leads", title: "Active Leads", value: data?.leads ?? 0 },
    { id: "stock_value", title: "Stock Value", value: data?.stock_value ?? "—" },
    { id: "tasks", title: "Open Tasks", value: data?.open_tasks ?? 0 },
    { id: "alerts", title: "Critical Alerts", value: (data?.alerts ?? []).length ?? 0 },
  ];

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {company.name} — Tenant Control Center
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Enterprise overview — finance, crm, inventory
          </p>
        </div>
      </header>

      <section>
        <KPIGrid items={kpis} />
      </section>
    </div>
  );
}
