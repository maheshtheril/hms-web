// app/api/__debug/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const BACKEND_URL = (process.env.BACKEND_URL || "").replace(/\/+$/, "");
  const target = BACKEND_URL ? `${BACKEND_URL}/healthz` : "(unset)";
  let ok = false, status = 0, body = "";

  try {
    if (BACKEND_URL) {
      const r = await fetch(`${BACKEND_URL}/healthz`, { cache: "no-store" });
      status = r.status;
      body = await r.text().catch(() => "");
      ok = r.ok;
    }
  } catch (e: any) {
    body = String(e?.message || e);
  }

  return NextResponse.json({
    BACKEND_URL,
    probe: { url: target, ok, status, body }
  });
}
