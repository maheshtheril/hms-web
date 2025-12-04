// web/app/api/user/companies/route.ts
import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND || process.env.CLIENT_API_BASE || "https://hms-server-njlg.onrender.com";

async function safeFetchWithRetry(url: string, init: RequestInit = {}, retries = 2, timeoutMs = 15000) {
  let lastErr: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      // rapid backoff
      if (attempt < retries) await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      else throw lastErr;
    }
  }
  throw lastErr;
}

export async function GET(req: Request) {
  const url = `${BACKEND.replace(/\/$/, "")}/api/user/companies`;
  const incomingCookie = req.headers.get("cookie") || "";

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (incomingCookie) headers["Cookie"] = incomingCookie;

  try {
    const res = await safeFetchWithRetry(url, {
      method: "GET",
      headers,
      cache: "no-store",
    }, 2, 15000);

    const ct = (res.headers.get("content-type") || "").toLowerCase();
    let body: any;
    try {
      body = ct.includes("application/json") ? await res.json() : await res.text();
    } catch {
      body = "(unparsable body)";
    }

    if (res.status === 401) {
      console.warn(`[proxy/companies] backend 401 — cookieForwarded=${!!incomingCookie}`);
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!res.ok) {
      console.error(`[proxy/companies] backend ${res.status}`, { url, snippet: typeof body === "string" ? body.slice(0, 400) : body });
      return NextResponse.json({ error: "backend_error", status: res.status, body: String(body).slice(0,500) }, { status: 502 });
    }

    return NextResponse.json(body, { status: 200 });
  } catch (err: any) {
    const name = err?.name || "unknown";
    const msg = err?.message || String(err);
    console.error(`[proxy/companies] fetch failed: ${name} — ${msg}`, {
      url,
      cookieForwarded: !!incomingCookie,
      time: new Date().toISOString()
    });

    return NextResponse.json({ error: "fetch_failed", message: msg }, { status: 502 });
  }
}
