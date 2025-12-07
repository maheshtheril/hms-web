//"use client";

import React from "react";
import LayoutShell from "@/components/LayoutShell"; // Dashboard shell (Topbar + Sidebar)
import { ToastProvider } from "@/components/toast/ToastProvider"; // Neural Glass toast system
import { CompanyProvider } from "@/app/providers/CompanyProvider"; // Company context for multi-company SaaS ERP
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | HMS SaaS ERP",
  description: "AI-powered multi-tenant hospital management dashboard",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  /**
   * ✅ Universal dashboard wrapper
   * - ToastProvider: Enables global toasts for notifications.
   * - CompanyProvider: Makes company selection (tenant/company_id) available to all nested pages.
   * - LayoutShell: Provides Neural Glass dashboard layout (Topbar + Sidebar).
   */
  return (
    <ToastProvider>
      <CompanyProvider>
        <LayoutShell>
          {children}
        </LayoutShell>
      </CompanyProvider>
    </ToastProvider>
  );
}
