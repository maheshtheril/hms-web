// app/dashboard/layout.tsx
import React from "react";
import LayoutShell from "@/components/LayoutShell"; // client component with Topbar+Sidebar
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // ✅ DO NOT render <html> here — Next's root layout already does that.
  return (
    <LayoutShell>
      {children}
    </LayoutShell>
  );
}
