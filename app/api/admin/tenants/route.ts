import { NextRequest, NextResponse } from "next/server";
const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function GET(req: NextRequest) {
  const r = await fetch(`${BACKEND}/api/tenants`, {
    headers: { cookie: req.headers.get("cookie") || "" },
  });
  return NextResponse.json(await r.json().catch(() => ({})), { status: r.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const r = await fetch(`${BACKEND}/api/tenants`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: req.headers.get("cookie") || "",
    },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await r.json().catch(() => ({})), { status: r.status });
}
