// app/lib/apiClient.ts (or your existing path)
"use client";

import axios, { AxiosError, AxiosRequestConfig } from "axios";

/**
 * Browser → Backend client.
 * - If NEXT_PUBLIC_API_URL is provided (prod or dev), we hit it directly (CORS path).
 *   We normalize it to end with `/api`.
 * - Otherwise, we use same-origin `/api` (Next.js rewrite → backend).
 * - Prevents double `/api` in URLs.
 * - Ensures JSON headers when sending a body.
 * - Logs in dev.
 * - Redirects to /login ONLY if /api/auth/me returns 401.
 */

/* ───────────────── helpers ───────────────── */
function resolveApiBase(rawEnv?: string): string | undefined {
  const raw = String(rawEnv ?? "").trim();
  if (!raw) return undefined;
  const noTrail = raw.replace(/\/+$/, "");
  const withApi = /\/api$/i.test(noTrail) ? noTrail : `${noTrail}/api`;
  return withApi.replace(/([^:]\/)\/+/g, "$1");
}

function isAbsolute(u: unknown): boolean {
  const s = String(u || "").toLowerCase();
  return s.startsWith("http://") || s.startsWith("https://");
}

function ensureJsonHeader(config: AxiosRequestConfig) {
  const hasBody =
    config.data !== undefined &&
    typeof config.data !== "string" &&
    !(typeof FormData !== "undefined" && config.data instanceof FormData);

  if (hasBody) {
    const h = (config.headers ||= {});
    const existing = (h as any)["Content-Type"] ?? (h as any)["content-type"];
    if (!existing) (h as any)["Content-Type"] = "application/json";
  }
}

function cleanPath(p: string): string {
  // one leading slash, collapse doubles
  return ("/" + String(p || "").trim().replace(/^\/+/, "")).replace(/\/{2,}/g, "/");
}

function up(m?: string) {
  return (m || "GET").toUpperCase();
}

/* ───────────────── baseURL ─────────────────
   Use NEXT_PUBLIC_API_URL if present (normalized to end with /api).
   Else fall back to same-origin /api (Next rewrite).
──────────────────────────────────────────── */
const envBase = resolveApiBase(process.env.BACKEND_URL);
const computedBaseURL = envBase || "/api";

/* ───────────────── axios instance ───────────────── */
export const apiClient = axios.create({
  baseURL: computedBaseURL,
  withCredentials: true,
  headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
  timeout: 20000,
});

if (process.env.NODE_ENV !== "production") {
  try {
    console.log("[apiClient] baseURL =", apiClient.defaults.baseURL);
  } catch {}
}

/* ───────────────── interceptors ───────────────── */
// REQUEST: normalize relative paths & avoid /api/api
apiClient.interceptors.request.use((config) => {
  const raw = String(config.url ?? "");

  if (!isAbsolute(raw)) {
    // Normalize once
    let p = cleanPath(raw);

    // If baseURL already ends with /api, ensure we DON'T prefix /api again:
    // strip a leading "/api" from the path so baseURL+/path => ".../api" + "/leads"
    if (String(apiClient.defaults.baseURL).toLowerCase().endsWith("/api")) {
      p = p.replace(/^\/api(\/|$)/i, "/");
    }

    config.url = p; // e.g. "/leads", "/auth/me", etc.
  }

  ensureJsonHeader(config);

  if (process.env.NODE_ENV !== "production") {
    try {
      const base = String(config.baseURL || apiClient.defaults.baseURL || "");
      console.debug("[apiClient] →", up(config.method), base.replace(/\/+$/, "") + String(config.url || ""));
    } catch {}
  }
  return config;
});

// RESPONSE: log; only redirect on 401 for /api/auth/me
apiClient.interceptors.response.use(
  (res) => {
    if (process.env.NODE_ENV !== "production") {
      try {
        const base = String(res.config.baseURL || apiClient.defaults.baseURL || "");
        console.debug(
          "[apiClient] ←",
          res.status,
          (res.config.method || "GET").toUpperCase(),
          base.replace(/\/+$/, "") + String(res.config.url || "")
        );
      } catch {}
    }
    return res;
  },
  (err) => {
    const status = err?.response?.status;
    const method = (err?.config?.method || "GET").toUpperCase();
    const base = String(err?.config?.baseURL || apiClient.defaults.baseURL || "");
    const url = String(err?.config?.url || "");
    const full = /^https?:\/\//i.test(url) ? url : base.replace(/\/+$/, "") + (url.startsWith("/") ? url : `/${url}`);

    if (process.env.NODE_ENV !== "production") {
      try {
        console.warn("[apiClient] ✕", status ?? "ERR", method, full);
        if (!status) console.warn("[apiClient] network/error:", err.message);
      } catch {}
    }

    // bounce to /login ONLY if the failing call is the auth check itself
    if (typeof window !== "undefined" && status === 401 && /\/api\/auth\/me(\?|$)/.test(full)) {
      try {
        sessionStorage.setItem("postLoginRedirect", window.location.pathname + window.location.search);
      } catch {}
      window.location.href = "/login";
      return;
    }

    return Promise.reject(err);
  }
);

/* ───────────────── types ───────────────── */
export type ApiError = AxiosError<{ message?: string; code?: string }>;
export function isApiError(e: unknown): e is ApiError {
  return !!(e && typeof e === "object" && (e as any).isAxiosError);
}
export default apiClient;
