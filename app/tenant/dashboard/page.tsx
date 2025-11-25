// app/tenant/dashboard/page.tsx
import React from "react";
import axios from "axios";
import HospitalDashboard from "@/components/dashboards/HospitalDashboard";
import EnterpriseDashboard from "@/components/dashboards/EnterpriseDashboard";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function getActiveCompany() {
  const cookieStore = cookies();
  const sid = cookieStore.get("sid")?.value;

  if (!sid) return null;

  const res = await axios.get(
    process.env.NEXT_PUBLIC_API_URL + "/api/user/companies",
    {
      withCredentials: true,
      headers: {
        Cookie: `sid=${sid}`,
      },
    }
  );

  // located from your real session middleware
  const companies = res.data?.companies || [];
  const activeId = res.data?.active_company_id;

  return companies.find((c: any) => c.id === activeId) || null;
}

export default async function TenantDashboardPage() {
  const company = await getActiveCompany();

  if (!company) {
    return (
      <div className="p-10 text-center text-red-400">
        No active company found for this tenant.
      </div>
    );
  }

  const industry = String(company.industry || "").toLowerCase();

  /* ============================
     INDUSTRY-BASED ROUTING
     ============================ */
  if (industry === "hospital" || industry === "hms") {
    return <HospitalDashboard company={company} />;
  }

  // fallback for other industries (retail, factory, clinic, etc)
  return <EnterpriseDashboard company={company} />;
}
