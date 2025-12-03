// Server Component (NO "use client")
import React from "react";
import Sidebar from "@/components/Sidebar/Sidebar";
import Topbar from "@/components/Topbar/Topbar";
import { MenuProvider } from "@/providers/MenuProvider";
import { cookies } from "next/headers";

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  // DEBUG: show what cookies the server received for this request
  const allCookies = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  console.log("tenant layout - incoming cookies:", allCookies);

  // Prefer forwarding only sid when present
  const sid = cookieStore.get?.("sid")?.value ?? "";
  const cookieHeader = sid ? `sid=${sid}` : "";

  if (!sid) {
    // No sid — DON'T call backend (avoids 401 spam). Use empty companies so UI still renders.
    console.warn("TenantLayout: no sid cookie found on request; skipping companies fetch.");
    return (
      <MenuProvider initialCompanies={[]}>
        <div className="min-h-screen bg-erp-bg text-white relative">
          <Sidebar />
          <Topbar />
          <main className="ml-64 pt-16 min-h-screen">
            <div className="max-w-[1400px] mx-auto px-6 py-6">{children}</div>
          </main>
        </div>
      </MenuProvider>
    );
  }

  let companies: any[] = [];
  try {
    console.log("TenantLayout: forwarding sid to backend (first 8 chars):", sid.slice(0, 8));
    const companiesRes = await fetch("https://hmsweb.onrender.com/api/user/companies", {
      method: "GET",
      headers: {
        cookie: cookieHeader,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    console.log("TenantLayout: backend companies status:", companiesRes.status);

    if (companiesRes.ok) {
      const data = await companiesRes.json();
      companies = data.companies || [];
    } else {
      console.error("TenantLayout: companies fetch failed, status:", companiesRes.status);
      companies = [];
    }
  } catch (err) {
    console.error("TenantLayout: companies fetch error:", err);
    companies = [];
  }

  return (
    <MenuProvider initialCompanies={companies}>
      <div className="min-h-screen bg-erp-bg text-white relative">
        <Sidebar />
        <Topbar />
        <main className="ml-64 pt-16 min-h-screen">
          <div className="max-w-[1400px] mx-auto px-6 py-6">{children}</div>
        </main>
      </div>
    </MenuProvider>
  );
}
