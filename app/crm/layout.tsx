// app/crm/layout.tsx
"use client";

import React, { useEffect, useState } from "react";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<null | boolean>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        if (!alive) return;
        setAuthed(r.ok);          // treat 200 as authenticated regardless of body shape
      } catch {
        if (alive) setAuthed(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (authed === null) {
    return (
      <div className="p-6 text-white/80">
        Checking your session…
      </div>
    );
  }

  if (authed === false) {
    if (typeof window !== "undefined") window.location.replace("/login");
    return null;
  }

  return <>{children}</>;
}
