import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ORIGIN = process.env.BACKEND_URL ?? "http://localhost:4000";
const PREFIX = (process.env.BACKEND_PREFIX ?? "").replace(/\/+$/,"");

function headers(req: NextRequest) {
  return {
    authorization: req.headers.get("authorization") ?? "",
    cookie: req.headers.get("cookie") ?? "",
    "content-type": req.headers.get("content-type") ?? "application/json",
  };
}

async function firstHit(req: NextRequest, urls: string[], init?: RequestInit) {
  for (let i = 0; i < urls.length; i++) {
    const r = await fetch(urls[i], { ...init, headers: headers(req), cache: "no-store" });
    if (r.status !== 404 || i === urls.length - 1) return r;
  }
  // never here
  return fetch(urls[urls.length - 1], { ...init, headers: headers(req), cache: "no-store" });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const candidates = [
    `${ORIGIN}${PREFIX}/admin/users/${params.id}`,
    `${ORIGIN}/api/admin/users/${params.id}`,
    `${ORIGIN}${PREFIX}/admin/user/${params.id}`, // singular fallback
  ];
  const r = await firstHit(req, candidates, { method: "GET" });
  const text = await r.text();
  return new NextResponse(text, { status: r.status, headers: { "content-type": r.headers.get("content-type") ?? "application/json" } });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.text();
  const candidates = [
    `${ORIGIN}${PREFIX}/admin/users/${params.id}`,
    `${ORIGIN}/api/admin/users/${params.id}`,
    `${ORIGIN}${PREFIX}/admin/user/${params.id}`,
  ];
  const r = await firstHit(req, candidates, { method: "PATCH", body });
  const text = await r.text();
  return new NextResponse(text, { status: r.status, headers: { "content-type": r.headers.get("content-type") ?? "application/json" } });
}
