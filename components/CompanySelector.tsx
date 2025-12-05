  // components/CompanySelector.tsx
  "use client";

  import React, { useState, useEffect } from "react";
  import { useRouter } from "next/navigation";

  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || process.env.BACKEND_URL || "https://hms-server-njlg.onrender.com";


  export default function CompanySelector() {
    const router = useRouter();
    const [companies, setCompanies] = useState<any[]>([]);
    const [active, setActive] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      let mounted = true;
      const controller = new AbortController();

      async function load() {
        setLoading(true);
        setError(null);

        try {
          const res = await fetch(`${BACKEND}/api/user/companies`, {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          });

          const text = await res.text();
          let data: any = {};
          try {
            data = text ? JSON.parse(text) : {};
          } catch {
            data = {};
            console.warn("CompanySelector: invalid JSON from backend:", text);
          }

          if (!mounted) return;

          if (res.status === 401) {
            setError("Not authenticated");
            setCompanies([]);
            setActive("");
            return;
          }

          if (!res.ok) {
            setError(`Failed to load companies (${res.status})`);
            setCompanies([]);
            setActive("");
            return;
          }

          const list = Array.isArray(data.companies)
            ? data.companies
            : Array.isArray(data.items)
            ? data.items
            : [];

          setCompanies(list);
          const activeId =
            data.active_company_id ??
            data.activeCompanyId ??
            data.active ??
            (list.length ? list[0].id : "");
          setActive(activeId ?? "");
        } catch (err: any) {
          if (err?.name === "AbortError") {
            setError("Request aborted");
          } else {
            console.error("CompanySelector load error:", err);
            setError(err?.message ?? "Network error");
          }
          setCompanies([]);
          setActive("");
        } finally {
          if (mounted) setLoading(false);
        }
      }

      load();
      return () => {
        mounted = false;
        controller.abort();
      };
    }, []);

    async function switchCompany(company_id: string) {
      try {
        const res = await fetch(`${BACKEND}/api/user/switch-company`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company_id }),
        });

        if (!res.ok) {
          console.warn("switchCompany failed", res.status);
          setError(`Switch failed (${res.status})`);
          return;
        }

        setActive(company_id);
        // Refresh so server-side menus / session-aware SSR pieces update
        router.refresh();
      } catch (err) {
        console.error("switchCompany error:", err);
        setError("Network error");
      }
    }

    if (loading) return <div className="text-white/70 px-3 py-2 text-sm">Loading companies…</div>;
    if (error) return <div className="text-red-300 px-3 py-2 text-sm">Error: {error}</div>;
    if (!companies.length) return <div className="text-white/70 px-3 py-2 text-sm">No companies found</div>;

    return (
      <select
        aria-label="Select company"
        value={active}
        onChange={(e) => switchCompany(e.target.value)}
        className="bg-white/10 text-white rounded-xl px-3 py-2 border border-white/20 outline-none"
      >
        <option value="" disabled>
          Select company…
        </option>
        {companies.map((c: any) => (
          <option key={c.id} value={c.id} className="text-black">
            {c.name}
          </option>
        ))}
      </select>
    );
  }
