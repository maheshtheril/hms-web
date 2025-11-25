"use client";

import React, { useEffect, useState } from "react";
import LoadingGlass from "@/app/dashboard/components/LoadingGlass";

export default function AppointmentRoleGuard({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { credentials: "include" });
        const j = await r.json();
        const allowed = ["admin", "manager", "receptionist", "doctor", "nurse", "patient"];
        setOk(allowed.includes(j?.role));
      } catch (e) {
        setOk(false);
      }
    })();
  }, []);

  if (ok === null) return <LoadingGlass />;
  if (!ok) return <div className="p-8 text-center text-red-400">Access denied</div>;
  return <>{children}</>;
}
