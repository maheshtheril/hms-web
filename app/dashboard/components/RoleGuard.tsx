"use client";

import React, { useEffect, useState } from "react";
import LoadingGlass from "./LoadingGlass";

interface RoleGuardProps {
  children: React.ReactNode;
  // allowed roles for this guard. If omitted, any authenticated user passes.
  roles?: string[];
  checkUrl?: string; // override the default /api/me
}

/**
 * RoleGuard
 * - Ensures user is authenticated (and optionally has one of the allowed roles)
 * - Shows LoadingGlass while checking
 * - Shows Unauthorized when check fails
 */
export default function RoleGuard({
  children,
  roles,
  checkUrl = "/api/me",
}: RoleGuardProps) {
  const [status, setStatus] = useState<"loading" | "done">("loading");
  const [allowed, setAllowed] = useState<boolean>(false);

  useEffect(() => {
    const ac = new AbortController();
    const signal = ac.signal;

    (async () => {
      try {
        const res = await fetch(checkUrl, {
          credentials: "include",
          method: "GET",
          headers: { "Accept": "application/json" },
          signal,
        });

        if (!res.ok) {
          setAllowed(false);
          setStatus("done");
          return;
        }

        const u = await res.json();

        // if roles not provided, any authenticated user with an id or role passes
        if (!roles || roles.length === 0) {
          const isAuth = Boolean(u && (u.id || u.user_id || u.role));
          setAllowed(isAuth);
        } else {
          // check if user has a matching role
          const userRole = u?.role ?? null;
          setAllowed(userRole ? roles.includes(String(userRole)) : false);
        }

        setStatus("done");
      } catch (err: any) {
        if (err?.name === "AbortError") return; // ignore cancellations
        setAllowed(false);
        setStatus("done");
      }
    })();

    return () => {
      ac.abort();
    };
  }, [roles, checkUrl]);

  if (status === "loading") return <LoadingGlass />;

  if (!allowed)
    return (
      <div className="flex items-center justify-center h-screen text-white">
        Unauthorized
      </div>
    );

  return <>{children}</>;
}
