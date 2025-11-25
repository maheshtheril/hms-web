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
    // canonical cookie name your backend sets (use env or default)
    const canonical = process.env.SESSION_COOKIE_NAME || process.env.SESSION_COOKIE || "erp_session";
    // quick existence check: look for canonical or common names
    const candidates = [canonical, "sid", "ssr_sid", "SESSION_ID", "session_id"];
    let found = null;
    for (const n of candidates) {
      const c = cookieStore.get(n);
      if (c?.value) {
        found = c.value;
        break;
      }
    }
    if (!found) {
      // no cookie available to forward
      console.debug("[getActiveCompany] no session cookie found in incoming request");
      return null;
    }

    const base = await getApiBase();
    const url = `${base}/api/user/companies`;

    // Forward the entire incoming cookie header (preserves real cookie name and signed cookies)
    const hdrs = await headers();
    const rawCookie = hdrs.get("cookie") ?? `${canonical}=${found}`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        cookie: rawCookie,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      console.error("getActiveCompany: downstream API error", { url, status: res.status, bodyText });
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
        server's BACKEND_URL is configured and that the <code>sid</code>{" "}
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
