// app/tenant/dashboard/page.tsx
"use server";

import React from "react";
import HospitalDashboard from "../../components/dashboards/HospitalDashboard";
import EnterpriseDashboard from "../../components/dashboards/EnterpriseDashboard";
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * IMPORTANT: Always talk to the backend service, not the web host.
 * Make sure this env is set on Render for the web app:
 *
 * NEXT_PUBLIC_BACKEND_URL = https://hms-server-njlg.onrender.com
 */
const BACKEND: string = (() => {
  const v =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.API_URL;

  if (!v || v.trim() === "") {
    throw new Error(
      "NEXT_PUBLIC_BACKEND_URL (or BACKEND_URL/API_URL) must be set to your server URL"
    );
  }

  // normalize: no trailing slash
  return v.replace(/\/+$/, "");
})();

async function getApiBase(): Promise<string> {
  return BACKEND;
}

async function getActiveCompany() {
  try {
    const cookieStore = await cookies();

    const canonical = process.env.SESSION_COOKIE_NAME || "sid";
    const candidates = [
      canonical,
      "sid",
      "ssr_sid",
      "SESSION_ID",
      "session_id",
      "erp_session",
    ];

    // 1) Read raw header cookie (authoritative)
    const hdrs = await headers();
    const headerCookie = hdrs.get("cookie") ?? "";

    // 2) Structured cookie read
    let foundFromCookieStore: string | null = null;
    for (const n of candidates) {
      const c = cookieStore.get(n);
      if (c?.value) {
        foundFromCookieStore = c.value;
        break;
      }
    }

    // 3) Try to extract canonical name from header cookie if needed
    let found = foundFromCookieStore;
    if (!found && headerCookie) {
      const esc = (s: string) =>
        s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      const m = headerCookie.match(new RegExp(`${esc(canonical)}=([^;\\s]+)`));
      if (m) {
        found = m[1];
      } else {
        const m2 = headerCookie.match(/sid=([^;\s]+)/);
        if (m2) found = m2[1];
      }
    }

    console.debug(
      "[getActiveCompany] headerCookiePresent:",
      !!headerCookie,
      "headerCookiePreview:",
      headerCookie ? headerCookie.slice(0, 120) : null
    );
    console.debug(
      "[getActiveCompany] cookieStoreFound:",
      !!foundFromCookieStore,
      "valuePreview:",
      foundFromCookieStore
        ? String(foundFromCookieStore).slice(0, 40)
        : null
    );
    console.debug(
      "[getActiveCompany] canonical:",
      canonical,
      "finalFound:",
      !!found
    );

    if (!found && !headerCookie) {
      console.debug(
        "[getActiveCompany] no session cookie at all — treating as unauthenticated"
      );
      return null;
    }

    const base = await getApiBase();
    const url = `${base}/api/user/companies`;

    const rawCookieToForward = headerCookie || `${canonical}=${found}`;

    console.debug(
      "[getActiveCompany] forwarding cookie preview:",
      rawCookieToForward.slice(0, 120),
      "to",
      url
    );

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
      console.error("[getActiveCompany] downstream API error", {
        url,
        status: res.status,
        bodyText,
      });
      return null;
    }

    const data = await res.json().catch(() => null);
    if (!data) {
      console.error("[getActiveCompany] failed to parse JSON from downstream", {
        url,
      });
      return null;
    }

    const companies = data?.companies || [];
    const activeId =
      data?.active_company_id || (companies.length > 0 ? companies[0].id : null);
    const foundCompany =
      companies.find((c: any) => c.id === activeId) || companies[0] || null;

    console.debug("[getActiveCompany] success", {
      activeId,
      companyFound: !!foundCompany,
    });

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
        No active company found for this tenant. If you are signed in, ensure
        the server&apos;s BACKEND_URL / NEXT_PUBLIC_BACKEND_URL is configured
        and that the <code>sid</code> cookie is present. Check server logs for
        details.
      </div>
    );
  }

  const industry = String(company.industry || "").toLowerCase();

  if (industry === "hospital" || industry === "hms") {
    return <HospitalDashboard company={company} />;
  }

  return <EnterpriseDashboard company={company} />;
}
