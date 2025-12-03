"use client";

import React, { useEffect, useState } from "react";
import KPIGrid from "./KPIGrid";
import { Company } from "@/types/company";

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  process.env.API_URL ||
  "";
const API = BACKEND.replace(/\/+$/, "");

export default function EnterpriseDashboard({ company }: { company: Company }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!company?.id) return;

    (async () => {
      try {
        const url = `${API}/api/company/dashboard?company_id=${company.id}`;
        console.debug("[EnterpriseDashboard] fetching:", url);

        const res = await fetch(url, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          console.error("EnterpriseDashboard failed:", res.status);
          setData({});
          return;
        }

        const json = await res.json().catch(() => ({}));
        setData(json);
      } catch (err) {
        console.error("EnterpriseDashboard error:", err);
        setData({});
      }
    })();
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

      {/* ... rest of your UI unchanged ... */}
    </div>
  );
}
