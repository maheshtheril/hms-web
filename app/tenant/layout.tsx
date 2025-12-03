// Server Component (NO "use client")
import React from "react";
import Sidebar from "@/components/Sidebar/Sidebar";
import Topbar from "@/components/Topbar/Topbar";
import { MenuProvider } from "@/providers/MenuProvider";
import { cookies } from "next/headers";

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  // await the cookie store (your Next version requires this)
  const cookieStore = await cookies();

  // Build raw cookie header
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  // Forward cookies to backend
  const companiesRes = await fetch("https://hmsweb.onrender.com/api/user/companies", {
    method: "GET",
    headers: {
      cookie: cookieHeader,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  let companies = null;
  if (companiesRes.ok) {
    companies = await companiesRes.json();
  } else {
    console.error("companies fetch failed", companiesRes.status);
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
