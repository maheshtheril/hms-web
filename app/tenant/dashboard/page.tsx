// app/tenant/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import HospitalDashboard from "../../components/dashboards/HospitalDashboard";
import EnterpriseDashboard from "../../components/dashboards/EnterpriseDashboard";
import { Company } from "@/types/company";

/**
 * IMPORTANT:
 * On Render (web app), set:
 *
 *   NEXT_PUBLIC_BACKEND_URL = https://hms-server-njlg.onrender.com
 */
const RAW_BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  process.env.API_URL ||
  "";

const BACKEND = RAW_BACKEND.replace(/\/+$/, "");

export default function TenantDashboardPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!BACKEND) {
      setError(
        "NEXT_PUBLIC_BACKEND_URL is not set. It must point to your backend server."
      );
      setLoading(false);
      return;
    }

    const url = `${BACKEND}/api/user/companies`;
    console.debug("[TenantDashboard] fetching companies from", url);

    (async () => {
      try {
        const res = await fetch(url, {
          method: "GET",
          credentials: "include", // sends sid cookie
          headers: {
            Accept: "application/json",
          },
        });

        if (res.status === 401) {
          setError("unauthenticated");
          setLoading(false);
          return;
        }

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("[TenantDashboard] /api/user/companies error", {
            status: res.status,
            body: txt,
          });
          setError("server_error");
          setLoading(false);
          return;
        }

        const data = await res.json().catch(() => null);
        if (!data) {
          setError("bad_response");
          setLoading(false);
          return;
        }

        const companies: Company[] = data.companies || [];
        const activeId =
          data.active_company_id || (companies[0] ? companies[0].id : null);

        const found =
          companies.find((c) => c.id === activeId) ||
          companies[0] ||
          null;

        console.debug("[TenantDashboard] resolved active company", {
          activeId,
          found: !!found,
        });

        setCompany(found);
        setLoading(false);
      } catch (err) {
        console.error("[TenantDashboard] unhandled error", err);
        setError("network_error");
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-300">
        Loading your dashboard...
      </div>
    );
  }

  if (error === "unauthenticated") {
    return (
      <div className="p-10 text-center text-red-400">
        You are not signed in. Please{" "}
        <a
          href="/signup"
          className="underline text-red-300 hover:text-red-200"
        >
          sign up / log in again
        </a>
        .
      </div>
    );
  }

  if (error && !company) {
    return (
      <div className="p-10 text-center text-red-400">
        Something went wrong loading your company: <code>{error}</code>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-10 text-center text-red-400">
        No company associated with this user. Complete signup / onboarding first.
      </div>
    );
  }

  const industry = String(company.industry || "").toLowerCase();

  if (industry === "hospital" || industry === "hms") {
    return <HospitalDashboard company={company} />;
  }

  return <EnterpriseDashboard company={company} />;
}
