// components/LayoutShell.tsx (client)
"use client";

import React from "react";
import AuthGate from "./AuthGate";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    console.log("[LayoutShell] mounted", window.location.pathname);
  }, []);

  // show a tiny skeleton while auth check runs (prevents blank flash)
  const fallback = (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
      <div className="text-sm text-white/60">Checking session…</div>
    </div>
  );

  return (
    <AuthGate fallback={fallback}>
      <>
        <Topbar />
        <div className="flex min-h-[calc(100vh-3.5rem)]">
          <Sidebar />
          <main className="flex-1">{children}</main>
        </div>
      </>
    </AuthGate>
  );
}
