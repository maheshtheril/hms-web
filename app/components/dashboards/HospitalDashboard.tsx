// app/components/dashboards/HospitalDashboard.tsx
import React from "react";
import KPIGrid from "./KPIGrid";

type Company = {
  id: string;
  name: string;
  industry?: string | null;
  logo_url?: string | null;
};

async function fetchTenantHospitalKPIs(companyId: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || "https://hms-server-njlg.onrender.com";
  // tenant dashboard endpoint will aggregate company-level KPIs too
  const res = await fetch(`${base}/api/company/dashboard?company_id=${companyId}`, {
    cache: "no-store",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function HospitalDashboard({ company }: { company: Company }) {
  const data = (await fetchTenantHospitalKPIs(company.id)) ?? {};

  const globalKPIs = [
    { id: "beds_total", title: "Beds (Occupied/Total)", value: data.beds_summary || "—" },
    { id: "admissions_today", title: "Admissions Today", value: data.admissions_today ?? 0 },
    { id: "opd_today", title: "OPD Today", value: data.opd_today ?? 0 },
    { id: "surgeries_today", title: "Surgeries Today", value: data.surgeries_today ?? 0 },
    { id: "pending_lab", title: "Pending Lab Reports", value: data.pending_lab ?? 0 },
    { id: "pharmacy_short", title: "Pharmacy Shortages", value: data.pharmacy_shortages ?? 0 },
    { id: "icu_occupancy", title: "ICU Occupancy", value: data.icu_occupancy ?? "—" },
    { id: "revenue_30d", title: "Revenue (30d)", value: data.revenue_30d ?? "—" },
  ];

  // Per-company panels (if tenant has multiple companies, backend returns companies array)
  const companies = data.companies ?? [{ id: company.id, name: company.name }];

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{company.name} — Hospital Cockpit</h1>
          <p className="mt-1 text-sm text-neutral-400">Operational HQ — aggregated & per-facility KPIs</p>
        </div>
      </header>

      <section>
        <KPIGrid items={globalKPIs} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Per-Facility Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companies.map((c: any) => (
            <div key={c.id} className="p-4 rounded-2xl bg-neutral-900/10">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-sm text-neutral-400">Industry: {c.industry ?? "—"}</div>
                </div>
                <div className="text-right text-sm text-neutral-300">
                  <div>Patients: {c.metrics?.active_patients ?? "—"}</div>
                  <div>Beds: {c.metrics?.occupied_beds ?? "—"}/{c.metrics?.total_beds ?? "—"}</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="p-2 rounded bg-neutral-900/20 text-center">
                  <div className="text-sm">OPD</div>
                  <div className="font-semibold">{c.metrics?.opd_today ?? 0}</div>
                </div>
                <div className="p-2 rounded bg-neutral-900/20 text-center">
                  <div className="text-sm">Admissions</div>
                  <div className="font-semibold">{c.metrics?.admissions_today ?? 0}</div>
                </div>
                <div className="p-2 rounded bg-neutral-900/20 text-center">
                  <div className="text-sm">Surgeries</div>
                  <div className="font-semibold">{c.metrics?.surgeries_today ?? 0}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-2 p-4 rounded-2xl bg-neutral-900/10">
          <h3 className="font-medium">Admissions Trend (7d)</h3>
          <div className="mt-4 h-56 rounded bg-neutral-800/30 flex items-center justify-center">Chart</div>
        </div>

        <aside className="space-y-4">
          <div className="p-4 rounded-2xl bg-neutral-900/20">
            <h4 className="text-sm font-medium">AI Insights</h4>
            <div className="mt-3 text-sm text-neutral-300">{data.ai_insights?.[0] ?? "No insights available"}</div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/20">
            <h4 className="text-sm font-medium">Alerts</h4>
            <ul className="mt-2 text-sm text-neutral-300 space-y-1">
              {(data.alerts ?? []).slice(0, 5).map((a: any, i: number) => (
                <li key={i}>• {a.message}</li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </div>
  );
}
