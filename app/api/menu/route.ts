// app/api/menu/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Menu proxy + sanitizer
 *
 * Purpose:
 * - Forward the /api/menu request server->backend (preserve cookies)
 * - If backend returns JSON menu items that include absolute frontend URLs,
 *   convert them to relative paths to avoid the client prefetching the
 *   frontend origin (which causes the repeated requests to hmsweb.onrender.com).
 *
 * NOTE: this intentionally avoids throwing if BACKEND is missing so you can
 * deploy and see a clear server log message instead of crashing the app.
 */

const BACKEND = (process.env.BACKEND_ORIGIN || process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");

// If you want a default during local dev you can set NEXT_PUBLIC_BACKEND_URL in .env
if (!BACKEND) {
  // Loud server-side warning (appears in Render / server logs)
  console.error("[menu.proxy] WARNING: BACKEND not configured. Set BACKEND_ORIGIN or NEXT_PUBLIC_BACKEND_URL.");
}

function sanitizeHref(h: unknown): unknown {
  if (!h || typeof h !== "string") return h;
  // If it's already a relative path, leave it.
  if (h.startsWith("/") || h.startsWith("#") || h.startsWith("mailto:") || h.startsWith("tel:")) return h;

  try {
    // Use URL to parse; allow missing scheme via base
    const u = new URL(h, "http://example");
    const host = (u.hostname || "").toLowerCase();

    // Recognize likely frontend hosts: common patterns here
    const frontendHosts = [
      "hmsweb.onrender.com",
      "your-frontend.onrender.com",
      "localhost",
      "127.0.0.1",
    ];

    // If it looks like a frontend host, convert to relative path
    if (frontendHosts.some((fh) => host.includes(fh))) {
      const rel = u.pathname + (u.search || "") + (u.hash || "");
      return rel || "/";
    }

    // If it's an absolute backend API URL (or other safe host) leave it unchanged.
    return h;
  } catch {
    return h;
  }
}

function sanitizePayload(payload: any) {
  if (!payload) return payload;

  // Generic sanitizer for arrays of menu items
  const sanitizeItem = (it: any) => {
    if (!it || typeof it !== "object") return it;
    const copy = { ...it };
    if (copy.href) copy.href = sanitizeHref(copy.href);
    // sometimes nested children/menus
    if (Array.isArray(copy.items)) copy.items = copy.items.map(sanitizeItem);
    if (Array.isArray(copy.children)) copy.children = copy.children.map(sanitizeItem);
    return copy;
  };

  if (Array.isArray(payload)) {
    return payload.map(sanitizeItem);
  }

  // object -> attempt to sanitize known keys
  const out = { ...payload };
  if (Array.isArray(out.menu)) out.menu = out.menu.map(sanitizeItem);
  if (Array.isArray(out.items)) out.items = out.items.map(sanitizeItem);
  if (Array.isArray(out.links)) out.links = out.links.map(sanitizeItem);
  return out;
}

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") || "";
  const target = BACKEND ? `${BACKEND}/api/menu` : `/api/menu`;

  try {
    const backendRes = await fetch(target, {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    // copy content-type if present
    const resHeaders = new Headers();
    const ct = backendRes.headers.get("content-type");
    if (ct) resHeaders.set("Content-Type", ct);

    const text = await backendRes.text();

    // Try to parse JSON safely — if parsing fails, return raw text
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // not JSON — return raw response (unchanged)
      return new NextResponse(text, { status: backendRes.status, headers: resHeaders });
    }

    // If parsed is JSON, sanitize any hrefs and re-serialize
    const sanitized = sanitizePayload(parsed);
    const body = JSON.stringify(sanitized);

    resHeaders.set("Content-Type", "application/json; charset=utf-8");
    return new NextResponse(body, { status: backendRes.status, headers: resHeaders });
  } catch (err: any) {
    // Network / fetch error — return a safe 502 with message and log server-side
    console.error("[menu.proxy] fetch error:", err?.message ?? err);
    const body = JSON.stringify({ error: "Failed to fetch menu from backend" });
    const resHeaders = new Headers({ "Content-Type": "application/json; charset=utf-8" });
    return new NextResponse(body, { status: 502, headers: resHeaders });
  }
}
