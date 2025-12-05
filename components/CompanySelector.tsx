"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCompanies as fetchCompaniesHelper } from "@/lib/fetchCompanies";
import { useMenu, Company as ProviderCompany } from "@/providers/MenuProvider";

/**
 * CompanySelector (fully typed)
 *
 * Behavior:
 * - Reads companies from MenuProvider when available.
 * - If provider has no companies, attempts to load them via fetchCompanies helper,
 *   falling back to a relative `/api/user/companies` fetch (helps with Next.js proxy).
 * - Switches company by POSTing to `/api/user/switch-company` (relative path).
 * - On successful switch, updates provider state, reloads menu, and calls router.refresh().
 *
 * Notes:
 * - This component intentionally uses relative API paths so it works with a Next.js proxy.
 * - If you want to use an absolute BACKEND origin, replace `apiBase` with your BACKEND URL.
 */

type Company = ProviderCompany; // keep local alias for clarity

const DEFAULT_API_BASE = ""; // keep empty for relative API paths (recommended)

function safeParseJson<T>(text: string): T | null {
  try {
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export default function CompanySelector(): JSX.Element {
  const router = useRouter();
  const { companies: ctxCompanies, setCompanies: setCtxCompanies, reloadMenu } = useMenu();

  // Local UI state
  const [localCompanies, setLocalCompanies] = useState<Company[]>(() => (ctxCompanies ?? []));
  const [active, setActive] = useState<string>(() => (ctxCompanies && ctxCompanies.length > 0 ? String(ctxCompanies[0].id) : ""));
  const [loading, setLoading] = useState<boolean>(ctxCompanies == null); // load if provider didn't give companies
  const [error, setError] = useState<string | null>(null);

  // API base (relative by default so Next.js proxy works)
  const apiBase = useMemo(() => DEFAULT_API_BASE, []);

  // Load companies on mount if provider didn't supply them
  useEffect(() => {
    let mounted = true;
    const ctrl = new AbortController();

    async function loadCompanies() {
      setLoading(true);
      setError(null);

      // Prefer provider value if present
      if (ctxCompanies && ctxCompanies.length > 0) {
        if (mounted) {
          setLocalCompanies(ctxCompanies);
          setActive(String(ctxCompanies[0].id));
          setLoading(false);
        }
        return;
      }

      // Try helper
      try {
        const helperResult = await fetchCompaniesHelper().catch(() => null);
        if (helperResult && Array.isArray(helperResult) && mounted) {
          setLocalCompanies(helperResult);
          setActive(helperResult.length > 0 ? String(helperResult[0].id) : "");
          // sync provider
          try {
            setCtxCompanies?.(helperResult);
          } catch {
            // ignore provider set failures
          }
          setLoading(false);
          return;
        }
      } catch {
        // swallow and fallback to direct fetch
      }

      // Fallback direct fetch using relative API
      try {
        const url = apiBase ? `${apiBase}/api/user/companies` : `/api/user/companies`;
        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: ctrl.signal,
        });

        if (res.status === 401) {
          if (!mounted) return;
          setError("Not authenticated");
          setLocalCompanies([]);
          setActive("");
          try { setCtxCompanies?.([]); } catch {}
          setLoading(false);
          return;
        }

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          if (!mounted) return;
          setError(`Failed to load companies (${res.status})`);
          console.warn("CompanySelector: companies fetch failed", res.status, txt);
          setLocalCompanies([]);
          setActive("");
          try { setCtxCompanies?.([]); } catch {}
          setLoading(false);
          return;
        }

        const raw = await res.text();
        const parsed = safeParseJson<unknown>(raw) ?? {};
        // possible shapes: array, { companies: [...] }, { items: [...] }, { data: { companies: [...] } }
        let list: Company[] = [];

        if (Array.isArray(parsed)) {
          list = parsed as Company[];
        } else if (parsed && typeof parsed === "object") {
          const obj = parsed as any;
          if (Array.isArray(obj.companies)) list = obj.companies as Company[];
          else if (Array.isArray(obj.items)) list = obj.items as Company[];
          else if (Array.isArray(obj.data?.companies)) list = obj.data.companies as Company[];
        }

        if (mounted) {
          setLocalCompanies(list);
          setActive(list.length > 0 ? String(list[0].id) : "");
          try { setCtxCompanies?.(list); } catch {}
          setLoading(false);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          // ignore
        } else {
          console.error("CompanySelector load error:", err);
          if (mounted) {
            setError(err?.message ?? "Network error");
            setLocalCompanies([]);
            setActive("");
            try { setCtxCompanies?.([]); } catch {}
            setLoading(false);
          }
        }
      }
    }

    // Perform load only if provider didn't give companies
    if (ctxCompanies == null || ctxCompanies.length === 0) {
      void loadCompanies();
    } else {
      // ensure local state is synced if provider has data
      setLocalCompanies(ctxCompanies);
      setActive(ctxCompanies.length > 0 ? String(ctxCompanies[0].id) : "");
      setLoading(false);
    }

    return () => {
      mounted = false;
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // one-time mount

  // switch company
  const switchCompany = useCallback(
    async (companyId: string) => {
      setError(null);
      setLoading(true);

      try {
        const url = apiBase ? `${apiBase}/api/user/switch-company` : `/api/user/switch-company`;
        const res = await fetch(url, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ company_id: companyId }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.warn("CompanySelector.switchCompany failed", res.status, txt);
          setError(`Switch failed (${res.status})`);
          setLoading(false);
          return;
        }

        // Try to parse response for any returned active id
        const raw = await res.text();
        const parsed = safeParseJson<unknown>(raw) ?? {};
        let activeId = companyId;
        if (parsed && typeof parsed === "object") {
          const obj = parsed as any;
          activeId = String(obj.active_company_id ?? obj.activeCompanyId ?? obj.active ?? companyId);
        }

        // update local & provider state
        setActive(activeId);
        try {
          // keep same list in provider, but provider could also fetch on reloadMenu
          setCtxCompanies?.(localCompanies);
        } catch {
          // ignore
        }

        // reload menu to pull company-specific menu (MenuProvider should use company info server-side)
        try {
          await reloadMenu();
        } catch {
          // ignore reload failures
        }

        // refresh page to update SSR pieces if necessary
        try {
          router.refresh();
        } catch {
          // ignore
        }
      } catch (err: any) {
        console.error("switchCompany error:", err);
        setError(err?.message ?? "Network error");
      } finally {
        setLoading(false);
      }
    },
    [apiBase, localCompanies, reloadMenu, router, setCtxCompanies]
  );

  // UI render
  if (loading) {
    return <div className="text-white/70 px-3 py-2 text-sm">Loading companies…</div>;
  }

  if (error) {
    return <div className="text-rose-400 px-3 py-2 text-sm">Error: {error}</div>;
  }

  if (!localCompanies || localCompanies.length === 0) {
    return <div className="text-white/70 px-3 py-2 text-sm">No companies found</div>;
  }

  return (
    <label className="inline-block">
      <span className="sr-only">Select company</span>
      <select
        aria-label="Select company"
        value={active}
        onChange={(e) => void switchCompany(String(e.target.value))}
        className="bg-white/10 text-white rounded-xl px-3 py-2 border border-white/20 outline-none"
      >
        <option value="" disabled>
          Select company…
        </option>
        {localCompanies.map((c) => (
          <option key={String(c.id)} value={String(c.id)}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
