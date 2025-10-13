import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Point this to your backend origin (no trailing slash)
const ORIGIN = process.env.BACKEND_URL ?? "http://localhost:4000";
// If your backend mounts under a prefix (e.g. /api or /api/v1), set it here or via .env.local
const PREFIX = (process.env.BACKEND_PREFIX ?? "").replace(/\/+$/,"");

function passHeaders(req: NextRequest) {
  return {
    authorization: req.headers.get("authorization") ?? "",
    cookie: req.headers.get("cookie") ?? "",
    "content-type": req.headers.get("content-type") ?? "application/json",
  };
}

async function firstNon404(req: NextRequest, urls: string[], init: RequestInit) {
  for (let i = 0; i < urls.length; i++) {
    const r = await fetch(urls[i], { ...init, headers: passHeaders(req), cache: "no-store" });
    if (r.status !== 404 || i === urls.length - 1) return r;
  }
  // never reached
  return fetch(urls[urls.length - 1], { ...init, headers: passHeaders(req), cache: "no-store" });
}

function buildCandidates(path: string, qs: string) {
  // Try the most common mount points FIRST. Add/adjust as needed.
  const candidates = [
    `${ORIGIN}${PREFIX}${path}${qs}`,            // e.g. http://:4000/api/admin/roles
    `${ORIGIN}${path}${qs}`,                     // e.g. http://:4000/admin/roles
    `${ORIGIN}/api${path}${qs}`,                 // e.g. http://:4000/api/admin/roles
    `${ORIGIN}${PREFIX}/v1${path}${qs}`,         // e.g. http://:4000/api/v1/admin/roles
    // Special RBAC fallback (many backends use /admin/rbac/roles)
    `${ORIGIN}${PREFIX}${path.replace("/admin/roles", "/admin/rbac/roles")}${qs}`,
  ];
  // Dedup
  return [...new Set(candidates)];
}

async function handle(req: NextRequest, params: { path: string[] }) {
  const method = req.method.toUpperCase();
  const url = new URL(req.url);
  const qs = url.search;
  const subpath = `/${(params.path || []).join("/")}`;   // e.g. '/users/123' or '/roles'
  const adminPath = `/admin${subpath}`;                  // ensure '/admin/*'

  const init: RequestInit = {
    method,
    body: ["GET","HEAD"].includes(method) ? undefined : await req.text(),
  };

  const candidates = buildCandidates(adminPath, qs);
  const upstream = await firstNon404(req, candidates, init);
  const text = await upstream.text();

  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } })   { return handle(req, ctx.params); }
export async function POST(req: NextRequest, ctx: { params: { path: string[] } })  { return handle(req, ctx.params); }
export async function PUT(req: NextRequest, ctx: { params: { path: string[] } })   { return handle(req, ctx.params); }
export async function PATCH(req: NextRequest, ctx: { params: { path: string[] } }) { return handle(req, ctx.params); }
export async function DELETE(req: NextRequest, ctx: { params: { path: string[] } }){ return handle(req, ctx.params); }
