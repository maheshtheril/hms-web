// web/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";
const SSR_COOKIE = "ssr_sid";

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const m = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m?.[1] ?? null;
}

export async function POST(req: Request): Promise<Response> {
  const sid = readCookie(req.headers.get("cookie"), SSR_COOKIE);

  // Optional: revoke session on the backend, ignore errors
  if (sid) {
    try {
      await fetch(`${BACKEND}/auth/logout`, {
        method: "POST",
        headers: { cookie: `sid=${sid};` },
      });
    } catch {
      // ignore backend errors during logout
    }
  }

  // Always clear local SSR cookie
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SSR_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // use false for http://localhost; set true in production HTTPS
    path: "/",
    maxAge: 0,
  });

  return res;
}

// Avoid any caching
export const dynamic = "force-dynamic";
