"use client";

import React from "react";

interface BillingRoleGuardProps {
  user: {
    role?: string | null;
    [key: string]: any;
  };
  children: React.ReactNode;
}

export default function BillingRoleGuard({
  user,
  children,
}: BillingRoleGuardProps) {
  const allowed = ["admin", "manager", "billing_staff"];

  // Prevent crash if user is undefined/null
  const userRole = user?.role ?? null;

  if (!allowed.includes(userRole || "")) {
    return (
      <div className="flex h-screen items-center justify-center text-red-400 text-xl">
        Access Denied – Billing Permissions Required
      </div>
    );
  }

  return <>{children}</>;
}
