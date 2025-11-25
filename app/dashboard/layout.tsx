// /app/dashboard/layout.tsx
"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import RoleGuard from "./components/RoleGuard";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface User {
  role?: string | null;
  [key: string]: any;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        Loading...
      </div>
    );
  }

  return (
    <RoleGuard>
      <div className="flex h-screen overflow-hidden">
        {/* ⭐ FIX: Sidebar now receives required role */}
        <Sidebar role={user.role ?? "staff"} />

        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar user={user} />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}
