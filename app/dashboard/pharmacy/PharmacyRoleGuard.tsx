"use client";

import React from "react";

interface PharmacyRoleGuardProps {
  user: {
    role?: string | null;
    [key: string]: any;
  };
  children: React.ReactNode;
}

/**
 * PharmacyRoleGuard
 * - Ensures only pharmacy-related roles can access wrapped content
 * - Strongly typed to remove implicit `any` errors
 */
export default function PharmacyRoleGuard({
  user,
  children,
}: PharmacyRoleGuardProps) {
  const allowed = ["admin", "manager", "pharmacy_staff"];
  const role = String(user?.role ?? "");

  if (!allowed.includes(role)) {
    return (
      <div className="flex h-screen items-center justify-center text-red-400 text-xl">
        Access Denied – Pharmacy Permissions Required
      </div>
    );
  }

  return <>{children}</>;
}
