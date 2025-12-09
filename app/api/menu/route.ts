// app/api/menu/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Menu proxy + sanitizer (no hardcoded frontend hosts)
 *
 * Goals:
 * - Forward /api/menu server->backend (preserve cookies)
 * - Convert absolute frontend-origin links to relative paths so client prefetch
 *   won't attempt to hit the frontend origin (avoids repeated hmsweb.onrender.com calls)
 * - Leave backend-origin and third-party absolute URLs unchanged
 * - Log conversions for visibility
 */

/* BACKEND origin (server/runtime). Prefer explicit server runtime var BACKEND_ORIGIN,
   otherwise allow NEXT_PUBLIC_BACKEND_URL for environments that set that. */
const BACKEND = ((process.env.BACKEND_ORIGIN || process.env.NEXT_PUBLIC_BACKEND_URL || "") as string).replace(/\/$/, "");

// Helper: request origin (server-side NextRequest has an absolute URL)
function getRequestOrigin(req: NextRequest): string {
  try {
    // NextRequest.url is absolute in server runtime: e.g. "https://your-frontend.onrender.com/..."
    const u = new URL(req.url);
    return u.origin.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

// Normalize origin for comparisons (lowercase, strip trailing slash)
function normalizeOrigin(o: string): string {
  return String(o || "").toLowerCase().replace(/\/+$/, "");
}

/**
 * sanitizeHref(h, req)
 * - If h is already relative/hash/mailto/tel -> keep as-is
 * - If absolute and origin === requestOrigin -> convert to relative path+search+hash
 * - If absolute and origin === BACKEND -> keep as-is (backend link)
 * - Otherwise keep absolute (third-party)
 */
function sanitizeHref(h: unknown, req: NextRequest): unknown {
  if (!h || typeof h !== "string") return h;

  // trivial safe cases
  if (h.startsWith("/") || h.startsWith("#") || h.startsWith("mailto:") || h.startsWith("tel:")) return h;

  try {
    // Use URL parser with a base so scheme-less URLs parse; we only care about origin/path/search/hash.
    const parsed = new URL(h, "http://example");
    const hrefOrigin = parsed.origin; // will be "http://example" for scheme-less without host, but that's fine
    const requestOrigin = getRequestOrigin(req);
    const normHref = normalizeOrigin(hrefOrigin);
    const normReq = normalizeOrigin(requestOrigin);
    const normBackend = normalizeOrigin(BACKEND);

    // If href origin matches the frontend origin (request origin) — convert to relative.
    if (normReq && normHref === normReq) {
      const rel = parsed.pathname + (parsed.search || "") + (parsed.hash || "");
      // Log conversions to help find backend places returning absolute frontend URLs
      try {
        // eslint-disable-next-line no-console
        console.debug("[menu.proxy] converted frontend absolute href -> relative:", { original: h, relative: rel, requestOrigin });
      } catch {}
      return rel || "/";
    }

    // If BACKEND is configured and href origin matches BACKEND, leave as-is.
    if (normBackend && normHref === normBackend) {
      return h;
    }

    // Otherwise — leave absolute URLs alone (third-party or other backend)
    return h;
  } catch {
    return h;
  }
}

function sanitizePayload(payload: any, req: NextRequest) {
  if (!payload) return payload;

  const sanitizeItem = (it: any): any => {
    if (!it || typeof it !== "object") return it;
    const copy = { ...it };

    if (copy.href) copy.href = sanitizeHref(copy.href, req);

    // nested lists often named items/children/menu/links — sanitize recursively
    if (Array.isArray(copy.items)) copy.items = copy.items.map(sanitizeItem);
    if (Array.isArray(copy.children)) copy.children = copy.children.map(sanitizeItem);
    if (Array.isArray(copy.menu)) copy.menu = copy.menu.map(sanitizeItem);
    if (Array.isArray(copy.links)) copy.links = copy.links.map(sanitizeItem);

    return copy;
  };

  if (Array.isArray(payload)) {
    return payload.map(sanitizeItem);
  }

  const out = { ...payload };
  if (Array.isArray(out.menu)) out.menu = out.menu.map(sanitizeItem);
  if (Array.isArray(out.items)) out.items = out.items.map(sanitizeItem);
  if (Array.isArray(out.links)) out.links = out.links.map(sanitizeItem);
  return out;
}

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") || "";
  const target = BACKEND ? `${BACKEND}/api/menu` : `/api/menu`;

  // Log resolution for debugging in server logs
  try {
    // eslint-disable-next-line no-console
    console.debug("[menu.proxy] target backend:", target, "BACKEND configured:", !!BACKEND, "requestOrigin:", getRequestOrigin(req));
  } catch {}

  try {
    const backendRes = await fetch(target, {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    // forward content-type if present
    const resHeaders = new Headers();
    const ct = backendRes.headers.get("content-type");
    if (ct) resHeaders.set("Content-Type", ct);

    const text = await backendRes.text();

    // Try parse JSON — if not JSON, return raw text unchanged
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      return new NextResponse(text, { status: backendRes.status, headers: resHeaders });
    }

    // Sanitise JSON payload (convert same-origin absolute frontend links to relative)
    const sanitized = sanitizePayload(parsed, req);
    const body = JSON.stringify(sanitized);

    resHeaders.set("Content-Type", "application/json; charset=utf-8");
    return new NextResponse(body, { status: backendRes.status, headers: resHeaders });
  } catch (err: any) {
    // network/fetch error -> return a safe 502 and log
    try {
      // eslint-disable-next-line no-console
      console.error("[menu.proxy] fetch error:", err?.message ?? err);
    } catch {}
    const body = JSON.stringify({ error: "Failed to fetch menu from backend" });
    const resHeaders = new Headers({ "Content-Type": "application/json; charset=utf-8" });
    return new NextResponse(body, { status: 502, headers: resHeaders });
  }
}
