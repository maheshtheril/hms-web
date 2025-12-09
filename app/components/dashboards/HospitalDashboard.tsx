"use client";

import React, { useEffect, useState } from "react";
import { Company } from "@/types/company";
import KPIGrid from "./KPIGrid";

/**
 * Safer client-side backend resolution:
 * - prefer NEXT_PUBLIC_BACKEND_URL when set
 * - otherwise use same-origin relative endpoints
 */
const RAW_BACKEND =
  (process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    "").trim();

const BACKEND = RAW_BACKEND ? RAW_BACKEND.replace(/\/+$/, "") : "";

function buildUrl(companyId: string) {
  if (BACKEND) {
    return `${BACKEND}/api/hms/dashboard?company_id=${encodeURIComponent(companyId)}`;
  }
  return `/api/hms/dashboard?company_id=${encodeURIComponent(companyId)}`;
}

export default function HospitalDashboard({ company }: { company: Company }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!company?.id) return;
    const controller = new AbortController();
    const signal = controller.signal;

    (async () => {
      const url = buildUrl(company.id);
      console.debug("[HospitalDashboard] fetching:", url, "BACKEND:", BACKEND || "(relative)");

      try {
        const res = await fetch(url, {
          credentials: "include",
          headers: { Accept: "application/json" },
          signal,
        });

        if (!res.ok) {
          // Helpful diagnostics; avoid trying to parse a 404/500 body as JSON blindly
          const text = await res.text().catch(() => "<no body>");
          console.error(`[HospitalDashboard] fetch failed ${res.status}:`, text);
          setData({});
          return;
        }

        const json = await res.json().catch(() => ({}));
        setData(json);
      } catch (err: any) {
        if (err?.name === "AbortError") {
          // cancelled on unmount, ignore
          return;
        }
        console.error("HospitalDashboard error:", err);
        setData({});
      }
    })();

    return () => controller.abort();
  }, [company?.id]);

  const kpis = [
    { id: "patients", title: "Active Patients", value: data?.patients ?? 0 },
    { id: "doctors", title: "Doctors", value: data?.doctors ?? 0 },
    { id: "appointments", title: "Appointments Today", value: data?.appointments ?? 0 },
    { id: "bed_occupancy", title: "Bed Occupancy", value: data?.bed_occupancy ?? "—" },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {company.name} — HMS Dashboard
      </h1>

      <KPIGrid items={kpis} />

      {/* ... rest unchanged ... */}
    </div>
  );
}
