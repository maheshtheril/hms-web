"use client";

import React, { useEffect, useState } from "react";
import { Company } from "@/types/company";
import KPIGrid from "./KPIGrid";

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  process.env.API_URL ||
  "";
const API = BACKEND.replace(/\/+$/, "");

export default function HospitalDashboard({ company }: { company: Company }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!company?.id) return;

    (async () => {
      try {
        const url = `${API}/api/hms/dashboard?company_id=${company.id}`;
        console.debug("[HospitalDashboard] fetching:", url);

        const res = await fetch(url, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        const json = await res.json().catch(() => ({}));
        setData(json);
      } catch (err) {
        console.error("HospitalDashboard error:", err);
        setData({});
      }
    })();
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
