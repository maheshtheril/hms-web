// components/AuthGate.tsx
"use client";

import React, { useEffect, useState } from "react";

/**
 * AuthGate
 * - Waits for /api/auth/me result before redirecting.
 * - Debounces redirect to allow cookie setting to settle.
 * - Emits useful console logs to debug redirect loops.
 * - Listens for "auth:update" and localStorage key 'gg.auth.updated' to re-check session.
 *
 * IMPORTANT: redirects to /login (not /auth/login) — change only if your app uses a different route.
 */

// Tell TypeScript about our custom window flag
declare global {
  interface Window {
    __gg_auth_redirecting?: boolean;
  }
}

export default function AuthGate({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [state, setState] = useState<{ loading: boolean; me: any | null }>({ loading: true, me: null });

  async function fetchMe() {
    setState({ loading: true, me: null });
    try {
      const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        console.debug("[AuthGate] /api/auth/me returned non-OK", res.status, txt);
        setState({ loading: false, me: null });
        return;
      }
      const body = await res.json().catch(() => null);
      console.debug("[AuthGate] got /api/auth/me", body);
      setState({ loading: false, me: body ?? null });
    } catch (err) {
      console.warn("[AuthGate] fetch /api/auth/me failed", err);
      setState({ loading: false, me: null });
    }
  }

  useEffect(() => {
    let mounted = true;

    // initial check
    fetchMe();

    const onAuthUpdate = () => {
      // small delay helps when login flow sets cookies then redirects
      setTimeout(() => {
        if (mounted) fetchMe();
      }, 50);
    };

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === "gg.auth.updated") onAuthUpdate();
    };

    window.addEventListener("auth:update", onAuthUpdate);
    window.addEventListener("storage", onStorage);

    return () => {
      mounted = false;
      window.removeEventListener("auth:update", onAuthUpdate);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Only redirect when check finished and user is absent.
    if (!state.loading && !state.me) {
      console.warn("[AuthGate] not authenticated — redirecting to /login");

      // Prevent multiple redirects using the global flag
      if (!window.__gg_auth_redirecting) {
        window.__gg_auth_redirecting = true;
        // slight delay to allow any final cookie writes to settle
        setTimeout(() => {
          // Use replace to avoid back navigation returning to protected UI
          window.location.replace("/login");
        }, 120);
      }
    } else if (!state.loading && state.me) {
      // authenticated — ensure other components can react
      // also clear any redirect flag so future logout/login flows work
      window.__gg_auth_redirecting = false;
    }
  }, [state.loading, state.me]);

  // show fallback while checking (avoid mounting Topbar/Sidebar prematurely)
  if (state.loading) return <>{fallback}</>;
  if (!state.me) return <>{fallback}</>; // fallback before redirect

  return <>{children}</>;
}
