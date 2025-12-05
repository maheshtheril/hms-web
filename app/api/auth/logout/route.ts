// safe proxy: do NOT throw during build; return 500 at request time if BACKEND missing
import { NextResponse } from "next/server";

const RAW_BACKEND = process.env.NEXT_PUBLIC_BACKEND_ORIGIN;
const BACKEND = typeof RAW_BACKEND === "string" && RAW_BACKEND.trim() ? RAW_BACKEND.trim() : null;

export async function POST(req: Request) {
  if (!BACKEND) {
    // fail gracefully at runtime instead of at build time
    console.error("NEXT_PUBLIC_BACKEND_ORIGIN missing");
    return NextResponse.json({ ok: false, error: "BACKEND_NOT_CONFIGURED" }, { status: 500 });
  }

  try {
    const cookie = req.headers.get("cookie") ?? "";
    const backendRes = await fetch(`${BACKEND.replace(/\/$/, "")}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: await req.text().catch(() => null),
    });

    const body = await backendRes.text();
    const res = new NextResponse(body, { status: backendRes.status });
    const setCookie = backendRes.headers.get("set-cookie");
    if (setCookie) res.headers.set("set-cookie", setCookie);
    return res;
  } catch (err) {
    console.error("Proxy /api/auth/logout failed:", err);
    return NextResponse.json({ ok: false, error: "proxy_failed" }, { status: 502 });
  }
}
