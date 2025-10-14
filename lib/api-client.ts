"use client";

import axios, { AxiosError, AxiosRequestConfig } from "axios";

/**
 * Client-side HTTP for Browser → Backend.
 * - In production: always use relative "/api" (Next.js rewrites → backend, no CORS)
 * - In development: you can set NEXT_PUBLIC_API_URL for local testing
 * - Handles JSON headers, logs in dev, redirects on 401
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

// ---------- baseURL logic ----------
const devEnvBase =
  process.env.NODE_ENV === "development"
    ? resolveApiBase(process.env.NEXT_PUBLIC_API_URL)
    : undefined;

// In production, hard-lock to "/api" (uses Next.js rewrite to backend)
const computedBaseURL = devEnvBase || "/api";

// ---------- axios instance ----------
export const apiClient = axios.create({
  baseURL: computedBaseURL, // always ends with /api
  withCredentials: true,
  headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
  timeout: 20000,
});

// ---------- runtime safety ----------
if (typeof window !== "undefined") {
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (!isLocal && apiClient.defaults.baseURL !== "/api") {
    apiClient.defaults.baseURL = "/api";
  }
}

// ---------- interceptors ----------
if (process.env.NODE_ENV !== "production") {
  try {
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
      console.debug("[apiClient] →", up(config.method), joinForLog(base, String(config.url || "")));
    } catch {}
  }
  return config;
});

apiClient.interceptors.request.use((config) => {
  const raw = String(config.url ?? "");

  if (!isAbsolute(raw)) {
    // normalize to always target Next rewrite under /api
    let p = raw.trim();

    // drop accidental double slashes
    p = p.replace(/^\/+/, "");

    // if already starts with "api/", keep; else prefix "api/"
    if (!/^api\//i.test(p)) {
      p = `api/${p}`;
    }

    // final path must start with one leading slash
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



// ---------- types ----------
export type ApiError = AxiosError<{ message?: string; code?: string }>;
export function isApiError(e: unknown): e is ApiError {
  return !!(e && typeof e === "object" && (e as any).isAxiosError);
}
export default apiClient;
