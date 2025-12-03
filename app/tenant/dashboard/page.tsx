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
 *
 * This file will also gracefully fall back to same-origin `/api/user/companies`
 * if NEXT_PUBLIC_BACKEND_URL is not provided (useful for local dev).
 */

const RAW_BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  process.env.API_URL ||
  "";

const BACKEND = RAW_BACKEND.replace(/\/+$/, "");

/** Build ordered endpoints to try (absolute first if BACKEND provided, then relative) */
function buildCandidates() {
  const rels = ["/api/user/companies", "/user/companies", "/api/user/companies"];
  if (BACKEND) {
    return rels.map((r) => `${BACKEND}${r}`);
  }
  // no BACKEND configured -> use same-origin relative endpoints
  return rels;
}

export default function TenantDashboardPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const candidates = buildCandidates();
    console.debug("[TenantDashboard] endpoints to try:", candidates);

    let mounted = true;
    (async () => {
      try {
        let lastResp: Response | null = null;
        let body: any = null;
        let usedUrl: string | null = null;

        for (const url of candidates) {
          try {
            console.debug("[TenantDashboard] trying", url);
            const res = await fetch(url, {
              method: "GET",
              credentials: "include",
              headers: { Accept: "application/json" },
            });

            lastResp = res;
            const txt = await res.text().catch(() => "");
            try {
              body = txt ? JSON.parse(txt) : null;
            } catch {
              body = txt;
            }

            // handle 401 explicitly (no point continuing to other origins in some cases)
            if (res.status === 401) {
              // if the server gave a JSON body with an error code, return that
              const errCode = body?.error || body?.message || "unauthenticated";
              console.warn("[TenantDashboard] got 401 from", url, "body:", body);
              // prefer to surface unauthenticated to UI
              if (mounted) {
                setError(String(errCode));
                setLoading(false);
              }
              return;
            }

            if (!res.ok) {
              console.warn("[TenantDashboard] non-OK response from", url, res.status, body);
              // try next candidate
              continue;
            }

            // success
            usedUrl = url;
            break;
          } catch (fetchErr) {
            console.warn("[TenantDashboard] fetch failed for", url, fetchErr);
            // try next candidate
            continue;
          }
        }

        if (!lastResp || !usedUrl) {
          console.error("[TenantDashboard] no endpoint returned OK. Last response:", lastResp);
          if (mounted) {
            setError("server_error");
            setLoading(false);
          }
          return;
        }

        // `body` should contain parsed JSON from the successful endpoint
        const data = body ?? null;
        if (!data) {
          console.error("[TenantDashboard] successful response had no JSON body (usedUrl:", usedUrl, ")");
          if (mounted) {
            setError("bad_response");
            setLoading(false);
          }
          return;
        }

        const companies: Company[] = Array.isArray(data.companies)
          ? data.companies
          : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.items)
          ? data.items
          : [];

        // Determine active company id in order of trust
        // 1) explicit active_company_id in response body
        // 2) if backend returns user object e.g. data.user.active_company_id
        // 3) if only 1 company available, pick it
        // 4) fallback: first company (kept for backward-compatibility — logged)
        const candidateActiveId =
          data.active_company_id ??
          (data.user && data.user.active_company_id) ??
          null;

        let activeId: string | null = null;

        if (candidateActiveId) {
          activeId = candidateActiveId;
          console.debug("[TenantDashboard] using active_company_id from response:", activeId);
        } else if (companies.length === 1) {
          activeId = companies[0].id;
          console.debug("[TenantDashboard] only one company found; auto-selecting:", activeId);
        } else if (companies.length > 0) {
          // Fallback for older backends / compatibility: pick first company but log loud
          console.warn(
            "[TenantDashboard] multiple companies available and no active_company_id provided — falling back to first company. Consider returning active_company_id from backend or implementing an explicit company selector in the UI."
          );
          activeId = companies[0].id;
        } else {
          activeId = null;
        }

        const foundCompany = companies.find((c) => c.id === activeId) ?? companies[0] ?? null;

        if (!foundCompany) {
          console.info("[TenantDashboard] no company could be resolved from response", { data });
          if (mounted) {
            setCompany(null);
            setError(null); // we want the "no company associated" UI
            setLoading(false);
          }
          return;
        }

        console.debug("[TenantDashboard] selected company", { activeId, foundCompany, usedUrl });

        if (mounted) {
          setCompany(foundCompany);
          setLoading(false);
        }
      } catch (err) {
        console.error("[TenantDashboard] unhandled error", err);
        if (mounted) {
          setError("network_error");
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-300">Loading your dashboard...</div>
    );
  }

  if (error === "unauthenticated" || error === "session_inactive" || error === "unauthenticated") {
    return (
      <div className="p-10 text-center text-red-400">
        You are not signed in. Please{" "}
        <a href="/signup" className="underline text-red-300 hover:text-red-200">
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
