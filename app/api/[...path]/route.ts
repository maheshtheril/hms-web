// app/api/[...path]/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // ensure Node, not Edge

function backendBase() {
  const fallback = "https://threegbackend.onrender.com";
  const base = String(process.env.BACKEND_URL || fallback).trim().replace(/\/+$/, "");
  return base; // e.g., https://threegbackend.onrender.com
}

function buildTarget(req: Request) {
  const url = new URL(req.url);                 // https://web/api/leads?x=1
  const path = url.pathname.replace(/^\/api/, ""); // -> /leads
  return `${backendBase()}/api${path}${url.search}`; // -> https://backend/api/leads?x=1
}

function copyRequestHeaders(req: Request) {
  const src = req.headers;
  const dst = new Headers();

  // pass through common safe headers
  const allow = new Set([
    "content-type",
    "authorization",
    "accept",
    "accept-encoding",
    "accept-language",
    "user-agent",
    "x-requested-with",
    "cookie", // important: forward cookies for auth
  ]);

  src.forEach((v, k) => {
    const key = k.toLowerCase();
    if (allow.has(key)) dst.set(key, v);
  });

  // Host must be backend’s host (some providers are picky)
  try {
    dst.set("host", new URL(backendBase()).host);
  } catch {}

  return dst;
}

function filterResponseHeaders(h: Headers) {
  const out = new Headers();

  // Copy only safe response headers (avoid hop-by-hop headers causing 502s)
  const allow = new Set([
    "content-type",
    "cache-control",
    "etag",
    "date",
    "last-modified",
    "set-cookie",     // critical for auth flows
    "vary",
    "x-powered-by",   // harmless
  ]);

  h.forEach((v, k) => {
    const key = k.toLowerCase();
    if (allow.has(key) || key.startsWith("x-")) out.append(key, v);
  });

  return out;
}

async function forward(req: Request) {
  const target = buildTarget(req);

  // Build init
  const init: RequestInit = {
    method: req.method,
    headers: copyRequestHeaders(req),
    cache: "no-store",
    redirect: "manual",
    // Node runtime will send content-length for ArrayBuffer automatically
  };

  // Attach body for non-GET/HEAD
  const m = req.method.toUpperCase();
  if (m !== "GET" && m !== "HEAD") {
    // Read the raw body once and pass through
    const buf = await req.arrayBuffer();
    init.body = buf;
  }

  try {
    const resp = await fetch(target, init);
    const headers = filterResponseHeaders(resp.headers);

    // Stream body back with sanitized headers
    return new Response(resp.body, { status: resp.status, headers });
  } catch (e: any) {
    // Don’t hide the target in prod logs—but return it in body for quick diagnosis
    return NextResponse.json(
      { error: "proxy_failed", message: String(e?.message || e), target },
      { status: 502 }
    );
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward;
