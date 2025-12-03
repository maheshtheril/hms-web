"use client";

import React, { useState, useEffect } from "react";

export default function CompanySelector() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/companies", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setCompanies(data.items || []);
        setActive(data.active_company_id);
      });
  }, []);

  async function switchCompany(company_id: string) {
    await fetch("/api/user/switch-company", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id }),
    });

    window.location.reload(); // reload menu + data
  }

  return (
    <select
      value={active ?? ""}
      onChange={(e) => switchCompany(e.target.value)}
      className="
        bg-white/10 text-white rounded-xl px-3 py-2
        border border-white/20 outline-none
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
