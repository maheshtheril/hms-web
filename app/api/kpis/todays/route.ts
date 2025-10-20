// web/app/api/kpis/todays/route.ts
import { NextResponse } from "next/server";

/**
 * Server-side proxy for /api/kpis/todays -> forwards to BACKEND_URL/kpis/todays
 * - BACKEND_URL must be set in the environment (server-side). Example:
 *   BACKEND_URL=https://threegbackend.onrender.com
 *
 * This avoids exposing backend host in client code and avoids CORS issues.
 */

const BACKEND = process.env.BACKEND_URL || "https://threegbackend.onrender.com";

function buildBackendUrl(tenantId?: string | null) {
  const u = new URL(`${BACKEND.replace(/\/$/, "")}/kpis/todays`);
  if (tenantId) u.searchParams.set("tenantId", tenantId);
  return u.toString();
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get("tenantId");

    const backendUrl = buildBackendUrl(tenantId);

    // server-to-server fetch (no browser cookie forwarded)
    const forwardResp = await fetch(backendUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
        // add any extra headers required by backend here, e.g. an API key:
        // "x-internal-api-key": process.env.INTERNAL_API_KEY ?? ""
      },
      // keep redirect/default behaviour
    });

    const contentType = forwardResp.headers.get("content-type") ?? "application/json";
    const body = await forwardResp.text(); // forward raw body

    return new NextResponse(body, {
      status: forwardResp.status,
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (err) {
    console.error("proxy /api/kpis/todays error:", err);
    return NextResponse.json({ error: "proxy_failed" }, { status: 500 });
  }
}
