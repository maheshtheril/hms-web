// web/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

// Load env value
const RAW_BACKEND = process.env.NEXT_PUBLIC_BACKEND_ORIGIN;

// Runtime validation (required in production)
if (!RAW_BACKEND) {
  throw new Error(
    "NEXT_PUBLIC_BACKEND_ORIGIN is missing. Set it in your environment variables."
  );
}

// Tell TypeScript: BACKEND is definitely a string.
const BACKEND: string = RAW_BACKEND;

export async function POST(req: Request) {
  try {
    const cookie = req.headers.get("cookie") ?? "";

    const backendRes = await fetch(`${BACKEND.replace(/\/$/, "")}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: await req.text().catch(() => null),
    });

    const body = await backendRes.text();

    const nextRes = new NextResponse(body, {
      status: backendRes.status,
    });

    const setCookie = backendRes.headers.get("set-cookie");
    if (setCookie) nextRes.headers.set("set-cookie", setCookie);

    return nextRes;
  } catch (err) {
    console.error("Proxy /api/auth/logout failed:", err);
    return NextResponse.json(
      { ok: false, error: "proxy_failed" },
      { status: 502 }
    );
  }
}
