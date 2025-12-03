"use client";

import React, { useState, useEffect } from "react";

export default function CompanySelector() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    async function loadCompanies() {
      try {
        const res = await fetch("https://hmsweb.onrender.com/api/user/companies", {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          console.error("CompanySelector /companies 401 or error:", res.status);
          return;
        }

        const data = await res.json();

        const list = data.companies || [];
        setCompanies(list);

        // If backend returns active, use that
        if (data.active_company_id) {
          setActive(data.active_company_id);
        } 
        // If not, default to first company
        else if (list.length > 0) {
          setActive(list[0].id);
        }

      } catch (err) {
        console.error("CompanySelector fetch error:", err);
      }
    }

    loadCompanies();
  }, []);

  async function switchCompany(company_id: string) {
    try {
      await fetch("https://hmsweb.onrender.com/api/user/switch-company", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id }),
      });

      // reload everything (menu + dashboard)
      window.location.reload();
    } catch (err) {
      console.error("switchCompany error:", err);
    }
  }

  if (!companies.length) {
    return (
      <div className="text-white/60 text-sm px-2">
        No companies found
      </div>
    );
  }

  return (
    <select
      value={active ?? ""}
      onChange={(e) => switchCompany(e.target.value)}
      className="
        bg-white/10 text-white rounded-xl px-3 py-2
        border border-white/20 outline-none
        backdrop-blur-md
      "
    >
      {companies.map((c) => (
        <option key={c.id} value={c.id} className="text-black">
          {c.name}
        </option>
      ))}
    </select>
  );
}
