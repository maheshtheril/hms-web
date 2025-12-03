"use client";

import React, { useState, useEffect } from "react";

export default function CompanySelector() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/user/companies", {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        // quick debug: if server returns non-JSON, log text
        const text = await res.text();
        let data: any = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch (e) {
          console.warn("CompanySelector: response not json:", text);
        }

        if (!mounted) return;

        if (!res.ok) {
          setError(`Failed to load companies (${res.status})`);
          setCompanies([]);
          setActive(null);
          setLoading(false);
          return;
        }

        // IMPORTANT: backend returns `companies` (not `items`) per your API
        const list = data.companies ?? data.items ?? [];
        setCompanies(Array.isArray(list) ? list : []);
        // Active company preferences might be in different keys; try multiple
        const activeId = data.active_company_id ?? data.activeCompanyId ?? data.active ?? null;
        if (activeId) {
          setActive(activeId);
        } else if (Array.isArray(list) && list.length > 0) {
          setActive(list[0].id);
        } else {
          setActive(null);
        }
      } catch (err: any) {
        console.error("CompanySelector load error:", err);
        setError(err?.message || "Network error");
        setCompanies([]);
        setActive(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function switchCompany(company_id: string) {
    try {
      const res = await fetch("/api/user/switch-company", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id }),
      });

      if (!res.ok) {
        console.warn("switchCompany failed", res.status);
        // optionally parse body for error
      } else {
        // optimistic update
        setActive(company_id);
        // full reload to refresh server-side menu & permissions
        window.location.reload();
      }
    } catch (err) {
      console.error("switchCompany error:", err);
    }
  }

  if (loading) {
    return <div className="text-white/70 px-3 py-2 text-sm">Loading companies…</div>;
  }

  if (error) {
    return <div className="text-red-300 px-3 py-2 text-sm">Error: {error}</div>;
  }

  if (!companies.length) {
    return <div className="text-white/70 px-3 py-2 text-sm">No companies found</div>;
  }

  return (
    <select
      value={active ?? ""}
      onChange={(e) => switchCompany(e.target.value)}
      className="bg-white/10 text-white rounded-xl px-3 py-2 border border-white/20 outline-none"
    >
      {companies.map((c: any) => (
        <option key={c.id} value={c.id} className="text-black">
          {c.name}
        </option>
      ))}
    </select>
  );
}
