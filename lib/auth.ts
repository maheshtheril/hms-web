// web/lib/auth.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type SessionUser = {
  user_id: string;
  email: string;
  name?: string;
  is_admin?: boolean;
  tenant_id?: string | null;
  company_id?: string | null;
};

export type SessionResp = { user: SessionUser | null };

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Build a Cookie header from the server's incoming request cookies.
 * This forwards the user's sid cookie to the API when called on the server.
 */
async function buildCookieHeaderFromNext(): Promise<string> {
  try {
    // cookies() may return a Promise<ReadonlyRequestCookies> in some Next versions/envs
    const jar = await cookies();
    const pairs = jar.getAll().map((c) => `${c.name}=${encodeURIComponent(c.value)}`);
    return pairs.join("; ");
  } catch {
    return "";
  }
}

/**
 * Server-side: fetch current session (uses incoming request cookies).
 * Use this in Server Components / loaders.
 */
export async function getSession(): Promise<SessionResp> {
  const cookieHeader = await buildCookieHeaderFromNext();
  const res = await fetch(`${API}/auth/session`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    // Don't cache session
    cache: "no-store",
  });

  if (!res.ok) return { user: null };
  try {
    return (await res.json()) as SessionResp;
  } catch {
    return { user: null };
  }
}

/**
 * Server-side guard: redirect to /login if no user.
 * Call at the top of protected pages (Server Components).
 */
export async function requireUser(): Promise<SessionUser> {
  const { user } = await getSession();
  if (!user) redirect("/login");
  return user;
}

/**
 * Client-side: lightweight hook to read session.
 * Useful in client components (e.g., Topbar) if you don’t want to pass props down.
 */
import { useEffect, useState } from "react";

export function useSession() {
  const [data, setData] = useState<SessionResp>({ user: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/auth/session`, {
          credentials: "include",
        });
        const json = (await res.json()) as SessionResp;
        if (alive) setData(json);
      } catch {
        if (alive) setData({ user: null });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { ...data, loading };
}
