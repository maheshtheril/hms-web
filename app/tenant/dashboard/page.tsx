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
    const canonical = process.env.SESSION_COOKIE_NAME || "sid"; // prefer env override
    const candidates = [canonical, "sid", "ssr_sid", "SESSION_ID", "session_id", "erp_session"];

    // 1) Raw header cookie (authoritative for forwarding)
    const hdrs = await headers();
    const headerCookie = hdrs.get("cookie") ?? "";

    // 2) Attempt structured cookie read (may not see HttpOnly)
    let foundFromCookieStore: string | null = null;
    for (const n of candidates) {
      const c = cookieStore.get(n);
      if (c?.value) {
        foundFromCookieStore = c.value;
        break;
      }
    }

    // 3) Try to extract canonical from headerCookie if cookieStore didn't find it
    let found = foundFromCookieStore;
    if (!found && headerCookie) {
      const esc = (s: string) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      const m = headerCookie.match(new RegExp(`${esc(canonical)}=([^;\\s]+)`));
      if (m) found = m[1];
      else {
        const m2 = headerCookie.match(/sid=([^;\s]+)/);
        if (m2) found = m2[1];
      }
    }

    // Logging to help you diagnose quickly
    console.debug("[getActiveCompany] headerCookiePresent:", !!headerCookie, "headerCookiePreview:", headerCookie ? headerCookie.slice(0, 120) : null);
    console.debug("[getActiveCompany] cookieStoreFound:", !!foundFromCookieStore, "valuePreview:", foundFromCookieStore ? String(foundFromCookieStore).slice(0, 40) : null);
    console.debug("[getActiveCompany] canonical:", canonical, "finalFound:", !!found);

    if (!found) {
      console.debug("[getActiveCompany] no session cookie found — returning null");
      return null;
    }

    const base = await getApiBase();
    const url = `${base}/api/user/companies`;

    // Prefer forwarding the raw header cookie when present to preserve exact names
    const rawCookieToForward = headerCookie || `${canonical}=${found}`;

    console.debug("[getActiveCompany] forwarding cookie preview:", rawCookieToForward.slice(0, 120), "to", url);

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        cookie: rawCookieToForward,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      console.error("[getActiveCompany] downstream API error", { url, status: res.status, bodyText });
      return null;
    }

    const data = await res.json().catch(() => null);
    if (!data) {
      console.error("[getActiveCompany] failed to parse JSON from downstream", { url });
      return null;
    }

    const companies = data?.companies || [];
    const activeId = data?.active_company_id;
    const foundCompany = companies.find((c: any) => c.id === activeId) || null;

    console.debug("[getActiveCompany] success", { activeId, companyFound: !!foundCompany });
    return foundCompany;
  } catch (err) {
    console.error("[getActiveCompany] unhandled error", err);
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
