// app/crm/layout.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<null | boolean>(null);
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    (async () => {
      try {
        const r = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!alive) return;
        setAuthed(r.ok); // treat 200 as authenticated
      } catch (err) {
        if (!alive) return;
        setAuthed(false);
      }
    })();

    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  // Loading — make sure styling matches your global dark bg to avoid white flash
  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-100">
        <div className="bg-white/4 backdrop-blur-md border border-white/6 px-6 py-4 rounded-2xl text-sm">
          Checking your session…
        </div>
      </div>
    );
  }

  if (authed === false) {
    // client-side replacement without full reload
    if (typeof window !== "undefined") router.replace("/login");
    return null;
  }

  return <>{children}</>;
}
