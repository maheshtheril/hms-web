"use client";

import React from "react";

interface HRRoleGuardProps {
  user: {
    role?: string | null;
    [key: string]: any;
  };
  children: React.ReactNode;
}

/**
 * HRRoleGuard
 * - Ensures only HR roles can access wrapped content
 * - Typed props to remove implicit `any` errors
 */
export default function HRRoleGuard({ user, children }: HRRoleGuardProps) {
  const allowed = ["admin", "hr_manager", "hr_staff"];

  const role = String(user?.role ?? "");

  if (!allowed.includes(role)) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500 text-lg">
        Access Denied – HR Permissions Required
      </div>
    );
  }

  return <>{children}</>;
}
