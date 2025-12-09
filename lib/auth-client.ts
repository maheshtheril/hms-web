// web/lib/auth-client.ts
"use client";
import { useEffect, useState } from "react";

type User = { id: string; email: string; role: string } | null;

function getApiBase(): string {
  // runtime override injected into page (recommended)
  if (typeof window !== "undefined" && (window as any).__API_BASE__) {
    return (window as any).__API_BASE__;
  }
  // build-time public env (required for client-side code)
  return (process.env.NEXT_PUBLIC_API_BASE as string) ?? "";
}

/**
 * useSession - client hook to fetch current user session.
 * - Uses absolute base if provided (NEXT_PUBLIC_API_BASE or window.__API_BASE__).
 * - Uses AbortController to avoid setState after unmount.
 * - Sends credentials (cookies) by default.
 */
export function useSession() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const base = getApiBase();
    // prefer absolute URL when base is present to avoid same-origin relative calls
    const url = base ? `${base.replace(/\/$/, "")}/api/auth/me` : `/api/auth/me`;

    (async () => {
      try {
        const res = await fetch(url, {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        // if response isn't JSON or unauthorized, handle gracefully
        if (!res.ok) {
          // 401/403 -> no session
          if (res.status === 401 || res.status === 403) {
            if (mounted) setUser(null);
            return;
          }
          // other errors -> try to parse JSON for message, otherwise null
          try {
            const err = await res.json();
            console.warn("useSession: auth check failed", res.status, err);
          } catch {
            console.warn("useSession: auth check failed", res.status);
          }
            if (mounted) setUser(null);
            return;
        }

        const json = await res.json().catch(() => ({ user: null }));
        if (mounted) setUser(json?.user ?? null);
      } catch (err: any) {
        if (err?.name === "AbortError") {
          // aborted — no-op
          return;
        }
        console.error("useSession fetch error", err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
    // empty deps: run once on mount
  }, []);

  return { user, loading };
}
