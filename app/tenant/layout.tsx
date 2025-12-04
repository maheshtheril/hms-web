// web/app/tenant/layout.tsx
// Server Component (NO "use client")
import React from "react";
import Sidebar from "@/components/Sidebar/Sidebar";
import Topbar from "@/components/Topbar/Topbar";
import { MenuProvider } from "@/providers/MenuProvider";
import { cookies } from "next/headers";

/**
 * BACKEND resolution (server-side)
 * - prefer explicit server runtime var BACKEND_ORIGIN
 * - fallback to NEXT_PUBLIC_BACKEND_URL (helpful for local / unified config)
 * - do NOT fallback to any hardcoded host (e.g. hmsweb). If missing, we log loudly.
 */
const BACKEND = (
  (process.env.BACKEND_ORIGIN || process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "")
);

if (!BACKEND) {
  // Loud log so you see it in Render / server logs and fix env quickly.
  // We don't throw here to avoid crashing pages while envs are being fixed,
  // but you can change to throw in production if you prefer.
  console.error(
    "[TenantLayout] WARNING: BACKEND not configured. Set BACKEND_ORIGIN (server) or NEXT_PUBLIC_BACKEND_URL (client)."
  );
}

/**
 * safeFetchWithRetry
 * - single retry on network errors (keeps pressure low)
 * - applies a timeout using AbortController
 */
async function safeFetchWithRetry(
  url: string,
  init: RequestInit = {},
  retries = 1,
  timeoutMs = 10000
): Promise<Response> {
  let lastError: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < retries) {
        const backoff = 200 * (attempt + 1);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

/**
 * parseResponseSafely
 * - tries to parse JSON when safe (small content-length)
 * - otherwise returns null or a small snippet to avoid buffering huge bodies
 */
async function parseResponseSafely(res: Response): Promise<any> {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const cl = res.headers.get("content-length");
  const maxAcceptBytes = 2_000_000; // 2 MB guard

  // If content-length exists and is large, avoid full parsing to reduce memory pressure
  if (cl && Number(cl) > maxAcceptBytes) {
    return null;
  }

  try {
    if (ct.includes("application/json")) {
      return await res.json();
    }
    return await res.text();
  } catch (e) {
    // fallback: attempt small snippet read from stream if available
    try {
      // read only first chunk to avoid buffering whole body
      const reader = res.body?.getReader();
      if (!reader) return null;
      const { value } = await reader.read();
      if (!value) return null;
      const s = new TextDecoder().decode(value);
      return s.slice(0, 1024);
    } catch {
      return null;
    }
  }
}

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  // Await cookies() — in your environment cookies() is a Promise
  const cookieStore = await cookies();

  // DEBUG: log only cookie names (no sensitive values)
  const cookieNames = cookieStore.getAll().map((c) => c.name).join(", ");
  console.log("tenant layout - incoming cookie keys:", cookieNames || "(none)");

  // Build header forwarding the full cookie string (server->server)
  const allCookies = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const cookieHeader = allCookies || "";

  if (!cookieHeader) {
    console.warn("TenantLayout: no cookies found on request; skipping companies fetch.");
    return (
      <MenuProvider initialCompanies={[]}>
        <div className="min-h-screen bg-erp-bg text-white relative">
          <Sidebar />
          <Topbar />
          <main className="ml-64 pt-16 min-h-screen">
            <div className="max-w-[1400px] mx-auto px-6 py-6">{children}</div>
          </main>
        </div>
      </MenuProvider>
    );
  }

  let companies: any[] = [];

  // Choose endpoint:
  // - Prefer explicit BACKEND (server runtime). If missing, fall back to a relative proxy route
  //   so deployed Next server can forward to the correct backend if configured.
  const endpoint = BACKEND ? `${BACKEND}/api/user/companies` : `/api/user/companies`;

  // Debug log to help verify what we're calling (remove in prod)
  console.log("[TenantLayout] resolved BACKEND:", BACKEND || "(none)");
  console.log("[TenantLayout] companies endpoint:", endpoint);

  try {
    // Log only a small sid snippet (if present) for debugging
    const sidSnippet = cookieHeader.match(/sid=([^;]+)/)?.[1]?.slice(0, 8) ?? null;
    console.log(`TenantLayout: forwarding cookie to backend (sid first8): ${sidSnippet ?? "(no sid)"}`);

    const res = await safeFetchWithRetry(
      endpoint,
      {
        method: "GET",
        headers: {
          Cookie: cookieHeader,
          Accept: "application/json",
        },
        cache: "no-store",
      },
      1, // single retry
      10000 // 10s timeout
    );

    console.log("TenantLayout: backend companies status:", res.status);

    if (res.status === 401) {
      console.warn("TenantLayout: backend returned 401 for companies. cookie forwarded:", !!cookieHeader);
      companies = [];
    } else if (!res.ok) {
      const bodySnippet = await parseResponseSafely(res);
      console.error("TenantLayout: companies fetch failed", {
        status: res.status,
        snippet: typeof bodySnippet === "string" ? bodySnippet.slice(0, 400) : bodySnippet,
      });
      companies = [];
    } else {
      const data = await parseResponseSafely(res);
      if (Array.isArray(data)) {
        companies = data;
      } else if (data && typeof data === "object") {
        companies = data.companies ?? data.items ?? [];
      } else {
        companies = [];
      }
    }
  } catch (err: any) {
    const name = err?.name ?? "unknown";
    const message = err?.message ?? String(err);
    console.error("TenantLayout: companies fetch error:", { name, message, endpoint, time: new Date().toISOString() });
    companies = [];
  }

  return (
    <MenuProvider initialCompanies={companies}>
      <div className="min-h-screen bg-erp-bg text-white relative">
        <Sidebar />
        <Topbar />
        <main className="ml-64 pt-16 min-h-screen">
          <div className="max-w-[1400px] mx-auto px-6 py-6">{children}</div>
        </main>
      </div>
    </MenuProvider>
  );
}
