// web/app/api/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:4000").replace(/\/+$/, "");

function join(base: string, p: string) {
  return `${base}/${p.replace(/^\/+/, "")}`;
}

export const dynamic = "force-dynamic";

async function proxy(req: NextRequest, ctx: { params: { path?: string[] } }) {
  // Map /api/* -> BACKEND /api/*
  const pathParts = ctx.params.path ?? [];
  const target = join(BACKEND_URL, `api/${pathParts.join("/")}`);

  // Copy headers but drop Next/Vercel internals and content-length
  const headers = new Headers();
  req.headers.forEach((v, k) => {
    if (/^x-nextjs-|^x-vercel-|^content-length$/i.test(k)) return;
    headers.set(k, v);
  });
  headers.set("X-Forwarded-Host", req.headers.get("host") || "");
  headers.set("X-Forwarded-Proto", "https");
  headers.set("X-Requested-With", "XMLHttpRequest");

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
    cache: "no-store",
    body: req.method === "GET" || req.method === "HEAD" ? undefined : (req.body as any),
  };

  try {
    const r = await fetch(target, init);
    const out = new NextResponse(r.body, {
      status: r.status,
      statusText: r.statusText,
      headers: r.headers,
    });
    out.headers.set("Vary", ["Origin", "Accept-Encoding", "Cookie"].join(", "));
    return out;
  } catch (e: any) {
    return NextResponse.json(
      { error: "proxy_failed", message: e?.message || "fetch failed" },
      { status: 502 }
    );
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS };
