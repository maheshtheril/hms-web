// app/api/_probe-auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
const BACKEND = process.env.BACKEND_ORIGIN ?? "http://localhost:4000";
export async function GET(req: NextRequest) {
  const sid = cookies().get("ssr_sid")?.value;
  const res = await fetch(`${BACKEND}/api/auth/me`, {
    headers: sid ? { cookie: `ssr_sid=${sid}` } : {},
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "content-type": res.headers.get("content-type") ?? "application/json" } });
}
