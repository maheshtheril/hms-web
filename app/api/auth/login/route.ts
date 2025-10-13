import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";
const SSR_COOKIE = "ssr_sid";

function splitSetCookies(h: Headers): string[] {
  // @ts-ignore
  const arr: string[] = h.getSetCookie?.() ?? [];
  if (arr.length) return arr;
  const raw = h.get("set-cookie");
  if (!raw) return [];
  return raw.split(/,(?=[^;]+=[^;]+)/g).map((s) => s.trim());
}
function pickCookie(cookies: string[], name: string): string | null {
  const re = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`, "i");
  for (const c of cookies) {
    const m = c.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

export async function POST(req: Request) {
  const body = await req.text();

  const r = await fetch(`${BACKEND}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const text = await r.text();
  const res = new NextResponse(text, {
    status: r.status,
    headers: { "Content-Type": r.headers.get("Content-Type") ?? "application/json" },
  });

  // Backend sets Secure+None on sid (HTTPS-only). Mirror it to our local cookie for SSR.
  const sid = pickCookie(splitSetCookies(r.headers), "sid");
  if (sid) {
    res.cookies.set(SSR_COOKIE, sid, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,         // IMPORTANT for http://localhost
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    // tiny debug aid (shows up in curl -i)
    res.headers.set("x-proxy-saw-sid", "1");
  }
  return res;
}
