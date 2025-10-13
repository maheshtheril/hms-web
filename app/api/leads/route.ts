// web/app/api/leads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_ORIGIN ?? "http://localhost:4000";

// Build headers for backend, mapping ssr_sid -> sid when needed
function buildHeaders(req: NextRequest, incomingCookie: string, sid?: string) {
  const h = new Headers();
  h.set("content-type", req.headers.get("content-type") ?? "application/json");

  // pass-through useful headers (auth/CSRF if you use them)
  const auth = req.headers.get("authorization");
  const csrf = req.headers.get("x-csrf-token") || req.headers.get("x-xsrf-token");
  if (auth) h.set("authorization", auth);
  if (csrf) { h.set("x-csrf-token", csrf); h.set("x-xsrf-token", csrf); }

  // backend expects "sid"; map "ssr_sid" if present
  if (sid) {
    h.set("cookie", `sid=${sid}; ${incomingCookie || ""}`);
  } else if (incomingCookie && !/;\s*sid=/.test(incomingCookie) && /ssr_sid=([^;]+)/.test(incomingCookie)) {
    const m = incomingCookie.match(/ssr_sid=([^;]+)/);
    h.set("cookie", `sid=${m![1]}; ${incomingCookie}`);
  } else {
    h.set("cookie", incomingCookie || "");
  }

  // trace for correlating logs
  h.set("x-trace", `leads-${Date.now()}`);
  return h;
}

function passThroughResponse(res: Response, bodyText: string) {
  const ct = res.headers.get("content-type") ?? "application/json";
  return new NextResponse(bodyText || "", { status: res.status, headers: { "content-type": ct } });
}

/* ------------------------------- POST /leads ------------------------------ */
export async function POST(req: NextRequest) {
  try {
    const incomingCookie = req.headers.get("cookie") || "";
    // Next 15: cookies() is async. If you're on Next 14, remove 'await'.
    const cookieStore = await cookies();
    const ssrSid = cookieStore.get("ssr_sid")?.value;

    const headers = buildHeaders(req, incomingCookie, ssrSid);
    const body = await req.text();

    // Try /api/leads first
    let res = await fetch(`${BACKEND}/api/leads`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });

    // Fallback to /leads only for 404/405
    if (res.status === 404 || res.status === 405) {
      res = await fetch(`${BACKEND}/leads`, {
        method: "POST",
        headers,
        body,
        cache: "no-store",
      });
    }

    const text = await res.text().catch(() => "");

    // On success, revalidate UI that depends on leads/KPIs
    if (res.ok) {
      try { revalidateTag("kpis"); } catch {}
      try { revalidatePath("/dashboard"); } catch {}
      // If your leads list page needs it:
      // try { revalidatePath("/crm/leads"); } catch {}
    }

    return passThroughResponse(res, text);
  } catch (err: any) {
    const message = err?.message || "upstream_error";
    return NextResponse.json({ error: "proxy_failed", message }, { status: 502 });
  }
}

/* ------------------------------- GET /leads ------------------------------- */
/* Optional: pass-through for listing/filtering leads via the same proxy.     */
/* Keep if your UI calls GET /api/leads from the browser.                     */
export async function GET(req: NextRequest) {
  try {
    const incomingCookie = req.headers.get("cookie") || "";
    const cookieStore = await cookies();
    const ssrSid = cookieStore.get("ssr_sid")?.value;

    const headers = buildHeaders(req, incomingCookie, ssrSid);

    const url = new URL(req.url);
    const qs = url.search; // preserve incoming query string

    let res = await fetch(`${BACKEND}/api/leads${qs}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.status === 404 || res.status === 405) {
      res = await fetch(`${BACKEND}/leads${qs}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
    }

    const text = await res.text().catch(() => "");
    return passThroughResponse(res, text);
  } catch (err: any) {
    const message = err?.message || "upstream_error";
    return NextResponse.json({ error: "proxy_failed", message }, { status: 502 });
  }
}
