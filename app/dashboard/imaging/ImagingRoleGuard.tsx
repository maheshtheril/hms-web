"use client";

import React from "react";

interface ImagingRoleGuardProps {
  user: {
    role?: string | null;
    [key: string]: any;
  };
  children: React.ReactNode;
}

/**
 * ImagingRoleGuard
 * - Protects imaging/radiology dashboard routes
 * - Removes all implicit any errors
 * - Uses strict typing for user & children
 */
export default function ImagingRoleGuard({ user, children }: ImagingRoleGuardProps) {
  const allowed = ["admin", "manager", "radiology_staff", "radiologist"];

  const role = String(user?.role ?? "");

  if (!allowed.includes(role)) {
    return (
      <div className="flex h-screen items-center justify-center text-red-400 text-xl">
        Access Denied – Imaging Permissions Required
      </div>
    );
  }

  return <>{children}</>;
}
