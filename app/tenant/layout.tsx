// Server Component (NO "use client")
import React from "react";
import Sidebar from "@/components/Sidebar/Sidebar";
import Topbar from "@/components/Topbar/Topbar";
import { MenuProvider } from "@/providers/MenuProvider";
import { cookies } from "next/headers";

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  // your Next version requires awaiting cookies()
  const cookieStore = await cookies();

  // Forward only the session cookie (e.g. "sid") instead of every cookie
  const sidCookie = cookieStore.get("sid");
  const cookieHeader = sidCookie ? `sid=${sidCookie.value}` : "";

  let companies: any[] | null = null;

  try {
    const companiesRes = await fetch("https://hmsweb.onrender.com/api/user/companies", {
      method: "GET",
      headers: {
        // only forward when we have a sid; otherwise backend will return 401 which is expected
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (companiesRes.ok) {
      companies = await companiesRes.json();
    } else {
      console.error("companies fetch failed", companiesRes.status);
      companies = []; // default to empty array so UI won't break
    }
  } catch (err) {
    console.error("companies fetch error", err);
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
