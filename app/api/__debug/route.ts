import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function backend() {
  const fb = "https://threegbackend.onrender.com";
  return (process.env.BACKEND_URL || fb).trim().replace(/\/+$/, "");
}

export async function GET() {
  const BACKEND_URL = backend();
  const out: any = { BACKEND_URL };

  try {
    const r = await fetch(`${BACKEND_URL}/healthz`, { cache: "no-store" });
    out.health = { ok: r.ok, status: r.status, body: await r.text().catch(() => "") };
  } catch (e: any) {
    out.health = { ok: false, error: String(e?.message || e) };
  }

  try {
    const r = await fetch(`${BACKEND_URL}/api/leads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lead_name: "probe" }),
      cache: "no-store",
    });
    out.postLeads = { ok: r.ok, status: r.status, body: (await r.text().catch(() => "")).slice(0, 200) };
  } catch (e: any) {
    out.postLeads = { ok: false, error: String(e?.message || e) };
  }

  return NextResponse.json(out);
}
