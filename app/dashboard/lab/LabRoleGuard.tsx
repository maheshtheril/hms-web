"use client";

import React from "react";

interface LabRoleGuardProps {
  user: {
    role?: string | null;
    [key: string]: any;
  };
  children: React.ReactNode;
}

/**
 * LabRoleGuard
 * - Protects Lab module routes
 * - Removes all implicit any errors
 * - Strict typing for both user + children
 */
export default function LabRoleGuard({ user, children }: LabRoleGuardProps) {
  const allowed = ["admin", "manager", "lab_staff"];

  const role = String(user?.role ?? "");

  if (!allowed.includes(role)) {
    return (
      <div className="flex h-screen items-center justify-center text-red-400 text-xl">
        Access Denied – Lab Permissions Required
      </div>
    );
  }

  return <>{children}</>;
}
