// web/app/api/kpis/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_ORIGIN ?? "http://localhost:4000";

function buildHeaders(req: NextRequest, incomingCookie: string, sid?: string) {
  const h = new Headers();

  // forward minimal headers
  const auth = req.headers.get("authorization");
  const csrf = req.headers.get("x-csrf-token") || req.headers.get("x-xsrf-token");
  if (auth) h.set("authorization", auth);
  if (csrf) { h.set("x-csrf-token", csrf); h.set("x-xsrf-token", csrf); }

  // backend expects "sid"; map Next's "ssr_sid" if needed
  if (sid) {
    h.set("cookie", `sid=${sid}; ${incomingCookie || ""}`);
  } else if (incomingCookie && !/;\s*sid=/.test(incomingCookie) && /ssr_sid=([^;]+)/.test(incomingCookie)) {
    const m = incomingCookie.match(/ssr_sid=([^;]+)/);
    h.set("cookie", `sid=${m![1]}; ${incomingCookie}`);
  } else {
    h.set("cookie", incomingCookie || "");
  }

  h.set("x-trace", `kpis-${Date.now()}`);
  return h;
}

function pass(res: Response, body: string) {
  const ct = res.headers.get("content-type") ?? "application/json";
  return new NextResponse(body || "", { status: res.status, headers: { "content-type": ct } });
}

export async function GET(req: NextRequest) {
  try {
    const incomingCookie = req.headers.get("cookie") || "";
    const cookieStore = await cookies(); // Next 15 is async
    const ssrSid = cookieStore.get("ssr_sid")?.value;

    const headers = buildHeaders(req, incomingCookie, ssrSid);

    // prefer /api/kpis on backend, fall back to /kpis if needed
    let res = await fetch(`${BACKEND}/api/kpis`, { headers, cache: "no-store" });
    if (res.status === 404 || res.status === 405) {
      res = await fetch(`${BACKEND}/kpis`, { headers, cache: "no-store" });
    }

    const text = await res.text().catch(() => "");
    return pass(res, text);
  } catch (err: any) {
    return NextResponse.json({ error: "proxy_failed", message: err?.message || "upstream_error" }, { status: 502 });
  }
}
