// app/components/dashboards/EnterpriseDashboard.tsx
// NOTE: reference schema (uploaded): file:///mnt/data/schema.sql
import React from "react";
import KPIGrid from "./KPIGrid";
import { cookies, headers } from "next/headers";

type Company = { id: string; name: string; industry?: string; logo_url?: string };

async function getApiBase(): Promise<string> {
  const envBase = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;
  if (envBase && envBase.trim() !== "") return envBase.replace(/\/+$/, "");

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  if (!host) throw new Error("Unable to determine API base URL. Set NEXT_PUBLIC_API_URL.");
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`.replace(/\/+$/, "");
}

async function fetchTenantEnterpriseKPIs(companyId: string) {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get("sid")?.value;
    if (!sid) return null;

    const base = await getApiBase();
    const url = `${base}/api/company/dashboard?company_id=${encodeURIComponent(companyId)}`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        cookie: `sid=${sid}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("EnterpriseDashboard: API error", { url, status: res.status, txt });
      return null;
    }

    return await res.json().catch(() => null);
  } catch (err: any) {
    console.error("EnterpriseDashboard: fetch failed", err);
    return null;
  }
}

export default async function EnterpriseDashboard({ company }: { company: Company }) {
  const data = (await fetchTenantEnterpriseKPIs(company.id)) ?? {};

  const kpis = [
    { id: "companies", title: "Companies", value: data.companies_count ?? 0 },
    { id: "employees", title: "Employees", value: data.employee_count ?? 0 },
    { id: "revenue_30d", title: "Revenue (30d)", value: data.revenue_30d ?? "—" },
    { id: "open_invoices", title: "Open Invoices", value: data.open_invoices ?? 0 },
    { id: "leads", title: "Active Leads", value: data.leads ?? 0 },
    { id: "stock_value", title: "Stock Value", value: data.stock_value ?? "—" },
    { id: "tasks", title: "Open Tasks", value: data.open_tasks ?? 0 },
    { id: "alerts", title: "Critical Alerts", value: (data.alerts ?? []).length ?? 0 },
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

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-2 p-4 rounded-2xl bg-neutral-900/10">
          <h3 className="font-medium">Revenue & Finance</h3>
          <div className="mt-4 h-56 rounded bg-neutral-800/30 flex items-center justify-center">
            Finance chart
          </div>
        </div>

        <aside className="space-y-4">
          <div className="p-4 rounded-2xl bg-neutral-900/20">
            <h4 className="text-sm font-medium">Module Status</h4>
            <ul className="mt-2 text-sm text-neutral-300">
              {(data.modules ?? []).map((m: any) => (
                <li key={m.name}>
                  {m.name} —{" "}
                  <span className={m.enabled ? "text-emerald-400" : "text-neutral-400"}>
                    {m.enabled ? "Enabled" : "Disabled"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/20">
            <h4 className="text-sm font-medium">Notifications</h4>
            <div className="mt-2 text-sm text-neutral-300">
              {(data.alerts ?? []).slice(0, 3).map((a: any, i: number) => (
                <div key={i}>• {a.message}</div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section>
        <h3 className="font-medium">Companies</h3>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data.companies ?? []).map((c: any) => (
            <div key={c.id} className="p-3 rounded-2xl bg-neutral-900/10">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-sm text-neutral-400">{c.industry ?? "—"}</div>
                </div>
                <div className="text-sm text-neutral-300 text-right">
                  <div>Revenue: {c.metrics?.revenue_30d ?? "—"}</div>
                  <div>Employees: {c.metrics?.employee_count ?? "—"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
