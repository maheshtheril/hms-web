"use client";

import axios, { AxiosError, AxiosRequestConfig } from "axios";

/**
 * Client-side HTTP for Browser → Backend (separate origins OK).
 * Invariant: baseURL ALWAYS ends with "/api".
 * - Uses NEXT_PUBLIC_API_URL when set; otherwise defaults to "/api" (Next proxy)
 * - Safe path normalization; leaves absolute URLs alone
 * - Dev logs; 401 → /login with post-login redirect
 */

// ---------- helpers ----------
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

// ---------- baseURL (ALWAYS /api) ----------
const envBase = resolveApiBase(process.env.NEXT_PUBLIC_API_URL);

// If env not provided, default to relative "/api" so invariant holds.
// This allows Next.js rewrites/proxy in dev & prod.
const computedBaseURL = envBase || "/api";

// ---------- axios instance ----------
export const apiClient = axios.create({
  baseURL: computedBaseURL,   // always ends with /api
  withCredentials: true,
  headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
  timeout: 20000,
});

// ---------- interceptors ----------
if (process.env.NODE_ENV !== "production") {
  try {
    // eslint-disable-next-line no-console
    console.log("[apiClient] baseURL =", apiClient.defaults.baseURL);
  } catch {}
}

apiClient.interceptors.request.use((config) => {
  const base = String(config.baseURL || computedBaseURL || "");

  if (!isAbsolute(config.url)) {
    config.url = apiPath(String(config.url || ""));
  }
  ensureJsonHeader(config);

  if (process.env.NODE_ENV !== "production") {
    try {
      // eslint-disable-next-line no-console
      console.debug("[apiClient] →", up(config.method), joinForLog(base, String(config.url || "")));
    } catch {}
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => {
    if (process.env.NODE_ENV !== "production") {
      try {
        const base = String(res.config.baseURL || computedBaseURL || "");
        // eslint-disable-next-line no-console
        console.debug("[apiClient] ←", res.status, up(res.config.method), joinForLog(base, String(res.config.url || "")));
      } catch {}
    }
    return res;
  },
  (err: AxiosError<any>) => {
    const status = err.response?.status;
    const method = up(err.config?.method);
    const base = String(err.config?.baseURL || computedBaseURL || "");
    const url = isAbsolute(err.config?.url) ? String(err.config?.url) : apiPath(String(err.config?.url || ""));
    const finalURL = joinForLog(base, url);

    if (process.env.NODE_ENV !== "production") {
      try {
        // eslint-disable-next-line no-console
        console.warn("[apiClient] ✕", status ?? "ERR", method, finalURL);
        if (!status) {
          // eslint-disable-next-line no-console
          console.warn("[apiClient] network/error:", err.message);
        } else if (err.response?.data && typeof err.response.data === "object") {
          // eslint-disable-next-line no-console
          console.warn("[apiClient] payload:", JSON.stringify(err.response.data));
        }
      } catch {}
    }

    if (status === 401 && typeof window !== "undefined") {
      try {
        sessionStorage.setItem("postLoginRedirect", window.location.pathname + window.location.search);
      } catch {}
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ---------- types ----------
export type ApiError = AxiosError<{ message?: string; code?: string }>;
export function isApiError(e: unknown): e is ApiError {
  return !!(e && typeof e === "object" && (e as any).isAxiosError);
}
export default apiClient;
