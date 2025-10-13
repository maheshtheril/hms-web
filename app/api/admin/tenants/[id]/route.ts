import { NextRequest, NextResponse } from "next/server";
const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const r = await fetch(`${BACKEND}/api/tenants/${params.id}`, { headers: {} });
  return NextResponse.json(await r.json().catch(() => ({})), { status: r.status });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const r = await fetch(`${BACKEND}/api/tenants/${params.id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: req.headers.get("cookie") || "",
    },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await r.json().catch(() => ({})), { status: r.status });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await fetch(`${BACKEND}/api/tenants/${params.id}`, {
    method: "DELETE",
    headers: { cookie: req.headers.get("cookie") || "" },
  });
  return NextResponse.json(await r.json().catch(() => ({})), { status: r.status });
}
