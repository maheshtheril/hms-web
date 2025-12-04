// web/app/api/user/companies/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Resolve backend origin from environment only.
 * No hardcoded host here — prefer render/runtime config:
 *  - BACKEND_ORIGIN (recommended)
 *  - NEXT_PUBLIC_BACKEND_URL (for client builds)
 *  - BACKEND (fallback)
 */
const BACKEND = (
  process.env.BACKEND_ORIGIN ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND ||
  ""
).replace(/\/$/, ""); // remove trailing slash if present

export async function GET(req: NextRequest) {
  // If backend not configured, return 500 with clear message.
  if (!BACKEND) {
    console.error("API proxy /api/user/companies: BACKEND is not configured in env.");
    return NextResponse.json(
      { error: "backend_not_configured", message: "Set BACKEND_ORIGIN or NEXT_PUBLIC_BACKEND_URL" },
      { status: 500 }
    );
  }

  // forward cookie header from incoming request
  const cookieHeader = req.headers.get("cookie") || "";

  const backendUrl = `${BACKEND}/api/user/companies`;

  try {
    const backendRes = await fetch(backendUrl, {
      method: "GET",
      headers: {
        cookie: cookieHeader,
        Accept: "application/json",
      },
      // do NOT include any credentials here; server fetch uses headers explicitly
    });

    // read as text and mirror status + content-type (safe and simple)
    const text = await backendRes.text();
    const resHeaders = new Headers();
    const ct = backendRes.headers.get("content-type");
    if (ct) resHeaders.set("Content-Type", ct);

    return new NextResponse(text, {
      status: backendRes.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error("Proxy /api/user/companies -> backend fetch failed:", err?.message || err);
    return NextResponse.json({ error: "proxy_error", message: String(err?.message || err) }, { status: 502 });
  }
}

export const runtime = "nodejs";
