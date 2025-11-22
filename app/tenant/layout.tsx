// Server Component (NO "use client")
import React from "react";
import Sidebar from "@/components/Sidebar/Sidebar";
import Topbar from "@/components/Topbar/Topbar";
import { MenuProvider } from "@/providers/MenuProvider";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <MenuProvider>
      <div className="min-h-screen bg-erp-bg text-white relative">
        {/* Client components (SSR-safe) */}
        <Sidebar />
        <Topbar />

        {/* Main content area */}
        <main className="ml-64 pt-16 min-h-screen">
          <div className="max-w-[1400px] mx-auto px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </MenuProvider>
  );
}
