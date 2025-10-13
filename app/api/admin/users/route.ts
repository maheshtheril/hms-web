import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ORIGIN = process.env.BACKEND_URL ?? "http://localhost:4000";
/** Optional, if your backend lives under /api — set BACKEND_PREFIX=/api in .env.local */
const PREFIX = (process.env.BACKEND_PREFIX ?? "").replace(/\/+$/,"");

function headers(req: NextRequest) {
  return {
    authorization: req.headers.get("authorization") ?? "",
    cookie: req.headers.get("cookie") ?? "",
    "content-type": req.headers.get("content-type") ?? "application/json",
  };
}

function toLimitOffset(url: URL) {
  // Convert page/pageSize -> limit/offset if your backend expects it
  const page = Number(url.searchParams.get("page") ?? "1");
  const size = Number(url.searchParams.get("pageSize") ?? "20");
  const limit = size > 0 ? size : 20;
  const offset = page > 1 ? (page - 1) * limit : 0;

  // Only add if not already present (don’t override backend-native params)
  if (!url.searchParams.has("limit")) url.searchParams.set("limit", String(limit));
  if (!url.searchParams.has("offset")) url.searchParams.set("offset", String(offset));
  return url.search;
}

async function tryFetch(req: NextRequest, urlCandidates: string[]) {
  for (const u of urlCandidates) {
    const r = await fetch(u, { headers: headers(req), cache: "no-store" });
    if (r.status !== 404) return r; // accept first non-404
  }
  // Return last 404 if all failed
  return fetch(urlCandidates[urlCandidates.length - 1], { headers: headers(req), cache: "no-store" });
}

export async function GET(req: NextRequest) {
  const clientURL = new URL(req.url);
  const nativeQS = clientURL.search;                 // pass-through
  const limitOffsetQS = toLimitOffset(new URL(req.url)); // converted variant

  // Try common backend mount points in order:
  const candidates = [
    `${ORIGIN}${PREFIX}/admin/users${nativeQS}`,
    `${ORIGIN}${PREFIX}/admin/users${limitOffsetQS}`,
    `${ORIGIN}/api/admin/users${nativeQS}`,          // if your backend is under /api
    `${ORIGIN}/api/admin/users${limitOffsetQS}`,
    `${ORIGIN}${PREFIX}/admin/users/list${nativeQS}`, // some servers use /list
    `${ORIGIN}${PREFIX}/admin/users/list${limitOffsetQS}`,
  ];

  const upstream = await tryFetch(req, candidates);
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const candidates = [
    `${ORIGIN}${PREFIX}/admin/users`,
    `${ORIGIN}/api/admin/users`,
    `${ORIGIN}${PREFIX}/admin/users/create`,
  ];
  // Try POST in order until not 404
  for (let i = 0; i < candidates.length; i++) {
    const r = await fetch(candidates[i], { method: "POST", headers: headers(req), body, cache: "no-store" });
    if (r.status !== 404 || i === candidates.length - 1) {
      const text = await r.text();
      return new NextResponse(text, {
        status: r.status,
        headers: { "content-type": r.headers.get("content-type") ?? "application/json" },
      });
    }
  }
}
