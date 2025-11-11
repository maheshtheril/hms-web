// app/lib/api-client.ts
"use client";

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

/**
 * Browser → Backend client.
 * - Normalizes NEXT_PUBLIC_API_URL / BACKEND_URL to end with /api.
 * - Avoids double /api in paths.
 * - Adds robust refresh-on-401 interceptor (queueing + retry once).
 * - Keeps existing redirect-to-/login behaviour for the auth probe.
 * - Exports idempotency helpers: setIdempotencyKey() and generateIdempotencyKey().
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
  return ("/" + String(p || "").trim().replace(/^\/+/, "")).replace(/\/{2,}/g, "/");
}

function up(m?: string) {
  return (m || "GET").toUpperCase();
}

/* ───────────────── baseURL ───────────────── */
const envBase =
  resolveApiBase(process.env.NEXT_PUBLIC_API_URL) ?? resolveApiBase(process.env.BACKEND_URL);
const computedBaseURL = envBase || "/api";

/* ───────────────── axios instance ───────────────── */
export const apiClient = axios.create({
  baseURL: computedBaseURL,
  withCredentials: true,
  headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
  timeout: 20000,
});

/* Minimal axios instance used for refresh calls to avoid interceptor recursion.
   It shares baseURL + withCredentials but does NOT reuse our interceptors. */
const refreshClient = axios.create({
  baseURL: apiClient.defaults.baseURL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

if (process.env.NODE_ENV !== "production") {
  try {
    // eslint-disable-next-line no-console
    console.log("[apiClient] baseURL =", apiClient.defaults.baseURL);
  } catch {}
}

/* ───────────────── Idempotency helpers ───────────────── */
/**
 * Attach an Idempotency-Key header to an axios config.
 * Usage:
 *   const key = generateIdempotencyKey('appointments');
 *   await apiClient.post('/hms/appointments', body, setIdempotencyKey({}, key));
 */
export function setIdempotencyKey(config?: AxiosRequestConfig, key?: string): AxiosRequestConfig {
  const c = config ?? {};
  if (!key) return c;
  c.headers = { ...(c.headers || {}), "Idempotency-Key": key };
  return c;
}

/**
 * Generate a reasonably collision-resistant idempotency key for client use.
 * Format: <prefix>_<timestamp_ms>_<randomHex12>
 * Example: "appointments_1698620000000_4f9a2b3c1d5e"
 */
export function generateIdempotencyKey(prefix?: string): string {
  const now = Date.now();
  // random 12 hex chars
  const rand = Array.from(cryptoRandomBytes(6))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const p = (prefix ?? "id").replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 24) || "id";
  return `${p}_${now}_${rand}`;
}

function cryptoRandomBytes(n: number): Uint8Array {
  if (typeof crypto !== "undefined" && typeof (crypto as any).getRandomValues === "function") {
    const arr = new Uint8Array(n);
    (crypto as any).getRandomValues(arr);
    return arr;
  }
  // fallback to Math.random (should be rare in modern browsers)
  const arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) arr[i] = Math.floor(Math.random() * 256);
  return arr;
}

/* ───────────────── Refresh-on-401 (queue + retry) ─────────────────
   Behavior:
   - When a response returns 401 (and request hasn't already been retried),
     attempt a single refresh by POSTing to /auth/refresh (configurable).
   - While refresh is in progress, queue other requests that fail with 401.
   - If refresh succeeds, retry queued requests once.
   - If refresh fails, fall back to prior behavior (redirect on auth probe or reject).
   - Each request is retried at most once to avoid loops. We mark
     config._retry to track retries locally (non-enumerable).
──────────────────────────────────────────────────────────── */

/* Make the refresh path configurable via env var so deployments that expose
   a different refresh path (e.g. /api/auth/refresh) work without code changes. */
const REFRESH_PATH = process.env.NEXT_PUBLIC_REFRESH_PATH ?? "/auth/refresh";

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;
const failedQueue: {
  config: AxiosRequestConfig;
  resolve: (value: AxiosResponse | PromiseLike<AxiosResponse>) => void;
  reject: (reason?: any) => void;
}[] = [];

function enqueueRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
  return new Promise((resolve, reject) => {
    failedQueue.push({ config, resolve, reject });
  });
}

async function processQueue(error: any | null) {
  while (failedQueue.length > 0) {
    const q = failedQueue.shift()!;
    if (error) {
      q.reject(error);
    } else {
      apiClient(q.config)
        .then(q.resolve)
        .catch(q.reject);
    }
  }
}

async function attemptRefresh(): Promise<void> {
  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      // Use refreshClient to avoid our response interceptor recursion.
      await refreshClient.post(REFRESH_PATH);
      await Promise.resolve();
    } catch (e: any) {
      // Better debug information when refresh fails in dev / staging.
      try {
        // eslint-disable-next-line no-console
        console.error(
          "[apiClient] refresh failed:",
          e?.response?.status ?? "NO_STATUS",
          e?.response?.data ?? e?.message ?? e
        );
      } catch {}
      throw e;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/* ───────────────── interceptors ───────────────── */
// REQUEST: normalize relative paths & avoid /api/api
apiClient.interceptors.request.use((config) => {
  const raw = String(config.url ?? "");

  if (!isAbsolute(raw)) {
    let p = cleanPath(raw);

    if (String(apiClient.defaults.baseURL).toLowerCase().endsWith("/api")) {
      p = p.replace(/^\/api(\/|$)/i, "/");
    }

    config.url = p;
  }

  ensureJsonHeader(config);

  if (process.env.NODE_ENV !== "production") {
    try {
      const base = String(config.baseURL || apiClient.defaults.baseURL || "");
      // eslint-disable-next-line no-console
      console.debug("[apiClient] →", up(config.method), base.replace(/\/+$/, "") + String(config.url || ""));
    } catch {}
  }
  return config;
});

// RESPONSE: log; refresh-on-401 logic in error handler
apiClient.interceptors.response.use(
  (res) => {
    if (process.env.NODE_ENV !== "production") {
      try {
        const base = String(res.config.baseURL || apiClient.defaults.baseURL || "");
        // eslint-disable-next-line no-console
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
  async (err: AxiosError) => {
    const status = err?.response?.status;
    const method = ((err?.config?.method as string) || "GET").toUpperCase();
    const base = String(err?.config?.baseURL || apiClient.defaults.baseURL || "");
    const url = String(err?.config?.url || "");
    const full = /^https?:\/\//i.test(url) ? url : base.replace(/\/+$/, "") + (url.startsWith("/") ? url : `/${url}`);

    if (process.env.NODE_ENV !== "production") {
      try {
        // eslint-disable-next-line no-console
        console.warn("[apiClient] ✕", status ?? "ERR", method, full);
        if (!status) console.warn("[apiClient] network/error:", err.message);
      } catch {}
    }

    const originalConfig = err.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!originalConfig) return Promise.reject(err);
    if (status !== 401) return Promise.reject(err);
    if (/\/auth\/refresh(\?|$)/i.test(full)) {
      return Promise.reject(err);
    }
    if ((originalConfig as any)._retry) {
      return Promise.reject(err);
    }

    (originalConfig as any)._retry = true;

    try {
      if (!isRefreshing) {
        try {
          await attemptRefresh();
        } catch (refreshErr) {
          await processQueue(refreshErr);
          // If a direct auth probe (me) failed, preserve redirect behaviour:
          if (typeof window !== "undefined" && /\/api\/auth\/me(\?|$)/.test(full) && status === 401) {
            try {
              sessionStorage.setItem("postLoginRedirect", window.location.pathname + window.location.search);
            } catch {}
            try {
              window.location.href = "/login";
            } catch {}
            return new Promise(() => {});
          }
          return Promise.reject(refreshErr);
        }
        await processQueue(null);
      } else {
        return enqueueRequest(originalConfig);
      }

      return apiClient(originalConfig);
    } catch (finalErr) {
      return Promise.reject(finalErr);
    }
  }
);

/* ───────────────── types ───────────────── */
export type ApiError = AxiosError<{ message?: string; code?: string }>;
export function isApiError(e: unknown): e is ApiError {
  return !!(e && typeof e === "object" && (e as any).isAxiosError);
}

export default apiClient;
