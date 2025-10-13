// web/lib/api-client.ts
"use client";

import axios, { AxiosError, AxiosRequestConfig } from "axios";

/**
 * Pure FE → BE client (separate origins)
 * - Reads NEXT_PUBLIC_API_URL (may be "http://localhost:4000" or "http://localhost:4000/api")
 * - Ensures baseURL ALWAYS ends with "/api"
 * - Safe path normalization (no double slashes, no stray spaces)
 * - Leaves absolute request URLs alone (you can override per-call)
 * - Dev-friendly logs
 * - Optional JSON default for plain-object bodies
 * - 401 → redirect to /login with intended-URL memory
 */

// ---------- base url helpers --------------------------------------------------

/** Ensure a clean, absolute backend base that *ends with* "/api". */
function resolveApiBase(rawEnv: string | undefined): string | undefined {
  const raw = String(rawEnv ?? "").trim();
  if (!raw) return undefined;

  // strip trailing slashes
  const noTrail = raw.replace(/\/+$/, "");

  // if it already ends with /api, keep it; otherwise append /api
  const withApi = /\/api$/i.test(noTrail) ? noTrail : `${noTrail}/api`;

  // final collapse of any accidental doubles (safe for http(s) because we don't touch protocol part here)
  return withApi.replace(/([^:]\/)\/+/g, "$1");
}

/** Ensure a clean single-slash-prefixed relative path (e.g. "admin/users" -> "/admin/users"). */
export function apiPath(p: string): string {
  let s = String(p ?? "").trim().replace(/^\/+/, "");
  s = "/" + s;
  return s.replace(/\/{2,}/g, "/");
}

/** True if a string looks like an absolute URL. */
function isAbsolute(u: unknown): boolean {
  const s = String(u || "").toLowerCase();
  return s.startsWith("http://") || s.startsWith("https://");
}

/** Pretty uppercase method. */
function up(m?: string) {
  return (m || "GET").toUpperCase();
}

/** If sending a plain object and no content-type, default to JSON (but not for FormData/strings). */
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

/** Join base + url for logging only (axios already does the real join). */
function joinForLog(base?: string, u?: string) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(u || "");
  if (!b) return p;
  return `${b}${p}`;
}

// ---------- construct baseURL -------------------------------------------------

const computedBaseURL = resolveApiBase(process.env.NEXT_PUBLIC_API_URL);

// Warn loudly if not configured
if (!computedBaseURL && process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line no-console
  console.warn(
    "[apiClient] NEXT_PUBLIC_API_URL is empty. Example values:",
    "\n  http://localhost:4000         // (auto → /api)",
    "\n  http://localhost:4000/api     // (kept as-is)"
  );
}

// ---------- axios instance ----------------------------------------------------

export const apiClient = axios.create({
  baseURL: computedBaseURL || undefined, // absolute base; guaranteed to end with /api when set
  withCredentials: true,                 // allow cookies across origins if you use cookie auth
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  timeout: 20000,
});

// ---------- interceptors ------------------------------------------------------

if (process.env.NODE_ENV !== "production") {
  try {
    // eslint-disable-next-line no-console
    console.log("[apiClient] baseURL =", apiClient.defaults.baseURL || "(unset)");
  } catch {}
}

apiClient.interceptors.request.use((config) => {
  const base = String(config.baseURL || computedBaseURL || "");

  // Leave absolute URLs alone; normalize relative ones
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
          // network/timeout
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

// ---------- types -------------------------------------------------------------

export type ApiError = AxiosError<{ message?: string; code?: string }>;
export function isApiError(e: unknown): e is ApiError {
  return !!(e && typeof e === "object" && (e as any).isAxiosError);
}

export default apiClient;
