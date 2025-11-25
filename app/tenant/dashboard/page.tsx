// app/tenant/dashboard/page.tsx
// NOTE: reference schema (uploaded): file:///mnt/data/schema.sql
import React from "react";
import HospitalDashboard from "../../components/dashboards/HospitalDashboard";
import EnterpriseDashboard from "../../components/dashboards/EnterpriseDashboard";
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";

async function getApiBase(): Promise<string> {
  // Prefer explicit env var (recommended)
  const envBase = process.env.BACKEND_URL || process.env.API_URL;
  if (envBase && envBase.trim() !== "") {
    return envBase.replace(/\/+$/, "");
  }

  // Fallback: attempt to build from incoming request headers (server-side)
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  if (!host) {
    throw new Error(
      "Unable to determine API base URL. Set BACKEND_URL in your environment."
    );
  }
  // prefer forwarded proto when present (Render / proxies), otherwise assume https
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`.replace(/\/+$/, "");
}

async function getActiveCompany() {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get("sid")?.value;
    if (!sid) return null;

    const base = await getApiBase();
    const url = `${base}/api/user/companies`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        cookie: `sid=${sid}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      // Log details server-side for debugging
      const bodyText = await res.text().catch(() => "");
      console.error("getActiveCompany: downstream API error", {
        url,
        status: res.status,
        bodyText,
      });
      return null;
    }

    const data = await res.json().catch(() => null);
    if (!data) return null;

    const companies = data?.companies || [];
    const activeId = data?.active_company_id;
    return companies.find((c: any) => c.id === activeId) || null;
  } catch (err) {
    console.error("getActiveCompany error", err);
    return null;
  }
}

export default async function TenantDashboardPage() {
  const company = await getActiveCompany();

  if (!company) {
    return (
      <div className="p-10 text-center text-red-400">
        No active company found for this tenant. If you are signed in, ensure the
        server's NEXT_PUBLIC_API_URL is configured and that the <code>sid</code>{" "}
        cookie is present. Check server logs for details.
      </div>
    );
  }

  const industry = String(company.industry || "").toLowerCase();

  if (industry === "hospital" || industry === "hms") {
    return <HospitalDashboard company={company} />;
  }

  return <EnterpriseDashboard company={company} />;
}
