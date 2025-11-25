"use client";

import React from "react";

interface InventoryRoleGuardProps {
  user: {
    role?: string | null;
    [key: string]: any;
  };
  children: React.ReactNode;
}

/**
 * InventoryRoleGuard
 * - Ensures only inventory-related roles can access wrapped content
 * - Strongly typed props to remove implicit `any` errors
 */
export default function InventoryRoleGuard({
  user,
  children,
}: InventoryRoleGuardProps) {
  const allowed = ["admin", "inventory_manager", "stock_staff", "purchase_staff"];

  const role = String(user?.role ?? "");

  if (!allowed.includes(role)) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500 text-xl">
        Access Denied – Inventory Permissions Required
      </div>
    );
  }

  return <>{children}</>;
}
