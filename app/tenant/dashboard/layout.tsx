"use client";

import React, { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function TenantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://hmsweb.onrender.com/api/user/companies", {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("unauthenticated");
        return r.json();
      })
      .then((d) => {
        setCompanies(d.companies || []);
      })
      .catch((e) => {
        console.error("Failed to load companies", e);
        setCompanies([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <>
      {/* Debug view – remove later */}
      <div style={{ padding: "10px", fontSize: "14px", background: "#f5f5f5" }}>
        {loading ? (
          <div>Loading companies…</div>
        ) : companies.length === 0 ? (
          <div>No companies available</div>
        ) : (
          <div>
            <strong>Companies:</strong>
            <ul>
              {companies.map((c) => (
                <li key={c.id}>{c.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {children}
    </>
  );
}
