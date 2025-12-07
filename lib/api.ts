// web/lib/api.ts
// Universal API helper — safe for local + production
// - prefers NEXT_PUBLIC_BACKEND_URL / NEXT_PUBLIC_API_URL
// - falls back to BACKEND_URL for server-side usage
// - last resort uses same-origin /api when in-browser
// - automatically sends credentials and handles JSON bodies/responses

type RequestInitExt = RequestInit & { timeoutMs?: number };

function resolveApiBase(): string {
  const publicBase =
    (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "")
      .trim();

  if (publicBase) return publicBase.replace(/\/$/, "");

  const serverBase = (process.env.BACKEND_URL || "").trim();
  if (serverBase) return serverBase.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    // Use same-origin but do not append "/api" here — caller supplies path starting with /api
    return window.location.origin;
  }

  // last resort: explicit error to make misconfiguration obvious
  throw new Error(
    "No backend URL configured. Set NEXT_PUBLIC_BACKEND_URL or BACKEND_URL in env."
  );
}

export const API_BASE = resolveApiBase();

function mergeHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers || {});
  // Ensure we accept json by default
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  return headers;
}

/** safe response parser: tries JSON, falls back to text, handles 204 */
async function parseResponse(res: Response) {
  if (res.status === 204) return null;
  const text = await res.text().catch(() => "");
  // empty body
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // not JSON — return raw text
    return text;
  }
}

function buildUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  // prefer API_BASE + p. If front-end wants to call backend's /api endpoints,
  // use: API_BASE + p  (make sure NEXT_PUBLIC_BACKEND_URL does not include trailing /api)
  return `${API_BASE}${p}`;
}

/**
 * Core fetch helper
 * - auto JSON stringify for body objects
 * - sets Content-Type when body is JSON
 * - supports timeoutMs via AbortController
 */
export async function api<T = any>(path: string, init: RequestInitExt = {}): Promise<T> {
  const url = buildUrl(path);
  const headers = mergeHeaders(init);

  const initCopy: RequestInit = {
    ...init,
    headers,
    credentials: init?.credentials ?? "include",
  };

  // If body is a plain object and Content-Type not set, treat as JSON
  if (init.body && typeof init.body === "object" && !(init.body instanceof FormData)) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    // If caller already passed a string, don't re-stringify
    if (typeof init.body !== "string") {
      (initCopy as any).body = JSON.stringify(init.body);
    }
  }

  // timeout
  let controller: AbortController | undefined;
  if (typeof init.timeoutMs === "number") {
    controller = new AbortController();
    (initCopy as any).signal = controller.signal;
    setTimeout(() => controller!.abort(), init.timeoutMs);
  }

  const res = await fetch(url, initCopy).catch((err) => {
    if ((err as any).name === "AbortError") throw new Error("Request timed out");
    throw err;
  });

  const parsed = await parseResponse(res);

  if (!res.ok) {
    // If parsed is an object and contains error/message, show them
    const detail =
      parsed && typeof parsed === "object"
        ? JSON.stringify(parsed)
        : typeof parsed === "string"
        ? parsed
        : "";
    throw new Error(`API ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`);
  }

  // typed return (null allowed)
  return parsed as T;
}

/** convenience helpers */
export const get = <T = any>(path: string, opts?: RequestInitExt) =>
  api<T>(path, { method: "GET", ...opts });
export const post = <T = any>(path: string, body?: any, opts?: RequestInitExt) =>
  api<T>(path, { method: "POST", body, ...opts });
export const put = <T = any>(path: string, body?: any, opts?: RequestInitExt) =>
  api<T>(path, { method: "PUT", body, ...opts });
export const del = <T = any>(path: string, opts?: RequestInitExt) =>
  api<T>(path, { method: "DELETE", ...opts });

export default api;
