"use client";

import axios, { AxiosError, AxiosRequestConfig } from "axios";

/**
 * Browser → Backend client.
 * - Production: always hit same-origin `/api/*` (Next.js rewrites → backend).
 * - Development: optional NEXT_PUBLIC_API_URL (we normalize it to end with /api).
 * - Ensures JSON headers when sending a body.
 * - Logs in dev.
 * - Redirects to /login ONLY if /api/auth/me returns 401.
 */

/* ───────────────── helpers ───────────────── */
function resolveApiBase(rawEnv: string | undefined): string | undefined {
  const raw = String(rawEnv ?? "").trim();
  if (!raw) return undefined;
  const noTrail = raw.replace(/\/+$/, "");
  const withApi = /\/api$/i.test(noTrail) ? noTrail : `${noTrail}/api`;
  return withApi.replace(/([^:]\/)\/+/g, "$1");
}

export function apiPath(p: string): string {
  let s = String(p ?? "").trim().replace(/^\/+/, "");
  s = "/" + s;
  return s.replace(/\/{2,}/g, "/");
}

function isAbsolute(u: unknown): boolean {
  const s = String(u || "").toLowerCase();
  return s.startsWith("http://") || s.startsWith("https://");
}

function up(m?: string) {
  return (m || "GET").toUpperCase();
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

function joinForLog(base?: string, u?: string) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(u || "");
  if (!b) return p;
  return `${b}${p}`;
}

/* ───────────────── baseURL ───────────────── */
const devEnvBase =
  process.env.NODE_ENV === "development"
    ? resolveApiBase(process.env.NEXT_PUBLIC_API_URL)
    : undefined;

// In prod we keep baseURL empty and build absolute same-origin paths in the interceptor.
const computedBaseURL = devEnvBase || "";

/* ───────────────── axios instance ───────────────── */
export const apiClient = axios.create({
  baseURL: computedBaseURL, // "" in prod, full in dev if NEXT_PUBLIC_API_URL provided
  withCredentials: true,
  headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
  timeout: 20000,
});

/* ───────────────── interceptors ───────────────── */
// Log base URL in dev
if (process.env.NODE_ENV !== "production") {
  try {
    console.log("[apiClient] baseURL =", apiClient.defaults.baseURL || "(empty)");
  } catch {}
}

// REQUEST: ensure exactly one "/api/" prefix for all relative paths
apiClient.interceptors.request.use((config) => {
  const raw = String(config.url ?? "");

  if (!isAbsolute(raw)) {
    // drop leading slashes and normalize
    let p = raw.trim().replace(/^\/+/, "");

    // ensure it starts with "api/"
    if (!/^api\//i.test(p)) p = `api/${p}`;

    // final: single leading slash
    config.url = `/${p}`; // => "/api/..."
  }

  ensureJsonHeader(config);

  if (process.env.NODE_ENV !== "production") {
    try {
      const base = String(config.baseURL || computedBaseURL || "");
      console.debug("[apiClient] →", up(config.method), joinForLog(base, String(config.url || "")));
    } catch {}
  }
  return config;
});

// RESPONSE: log in dev, and only redirect on 401 for /api/auth/me
apiClient.interceptors.response.use(
  (res) => {
    if (process.env.NODE_ENV !== "production") {
      try {
        const base = String(res.config.baseURL || computedBaseURL || "");
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
    const base = String(err?.config?.baseURL || computedBaseURL || "");
    const url = String(err?.config?.url || "");
    const path = /^https?:\/\//i.test(url)
      ? url
      : base.replace(/\/+$/, "") + (url.startsWith("/") ? url : `/${url}`);

    if (process.env.NODE_ENV !== "production") {
      try {
        console.warn("[apiClient] ✕", status ?? "ERR", method, path);
        if (!status) console.warn("[apiClient] network/error:", err.message);
      } catch {}
    }

    // Only bounce to /login if the auth check itself failed
    if (typeof window !== "undefined" && status === 401 && /\/api\/auth\/me(\?|$)/.test(path)) {
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
