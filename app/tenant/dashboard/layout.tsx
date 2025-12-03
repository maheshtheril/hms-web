// app/tenant/dashboard/layout.tsx
import React from "react";

export const dynamic = "force-dynamic";

export default function TenantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No data fetching here at all – just render the page
  return <>{children}</>;
}
