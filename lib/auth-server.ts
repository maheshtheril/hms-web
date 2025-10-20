import { cookies } from "next/headers";

export type SessionUser = { id: string; email: string; role: string; tenantId?: string; companyId?: string };
export type SessionResp = { user: SessionUser | null };

// lib/auth-server.ts (server side)
const BACKEND =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (() => { throw new Error("BACKEND_URL or NEXT_PUBLIC_BACKEND_URL must be set on the server"); })();

// use BACKEND inside functions, do not re-declare `export` inside functions
export { BACKEND };

const SSR_COOKIE = "ssr_sid";

export async function getSession(): Promise<SessionResp> {
  const cm: any = (cookies as unknown as () => any)();
  const c = typeof cm?.then === "function" ? await cm : cm;
  const sid: string | undefined = c?.get?.(SSR_COOKIE)?.value;
  if (!sid) return { user: null };

  try {
    const r = await fetch(`${BACKEND}/auth/me`, {
      method: "GET",
      headers: { cookie: `sid=${sid};` },
      cache: "no-store",
    });
    if (!r.ok) return { user: null };
    const data = (await r.json()) as SessionResp;
    return data?.user ? data : { user: null };
  } catch {
    return { user: null };
  }
}
