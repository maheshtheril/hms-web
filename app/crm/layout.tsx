// web/app/crm/layout.tsx
import React from "react";
import LayoutShell from "@/components/LayoutShell"; // client wrapper with Topbar + Sidebar
import type { Metadata } from "next";

export const metadata: Metadata = { title: "CRM" };

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    // LayoutShell is a client component and will mount Topbar + Sidebar for all /crm routes
    <LayoutShell>{children}</LayoutShell>
  );
}
