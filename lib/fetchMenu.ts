// web/lib/fetchMenu.ts
import { MenuResponse } from "@/types/menu";
import { BACKEND } from "@/lib/env"; // central backend URL (may be empty for same-origin proxy)

/**
 * Client-side menu fetch helper
 * - uses sessionStorage cache for fast UI
 * - background refresh to keep cache fresh
 * - timeout + single retry with small backoff
 */

const MENU_CACHE_KEY = "erp:menu:v1";
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_RETRIES = 1;

/** low-level timeout fetch */
async function timeoutFetch(input: RequestInfo, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

/** retry wrapper */
async function fetchWithRetries<T>(url: string, init: RequestInit = {}, retries = DEFAULT_RETRIES, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  let lastErr: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await timeoutFetch(url, init, timeoutMs);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${body ? `: ${body.slice(0,200)}` : ""}`);
      }
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        return (await res.json()) as T;
      }
      // fallback try parse
      const text = await res.text();
      // @ts-ignore
      return JSON.parse(text) as T;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        // small backoff
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr;
}

/** Resolve URL: prefer BACKEND if configured, otherwise same-origin proxy */
function resolveMenuUrl(): string {
  if (BACKEND && BACKEND.length > 0) {
    return `${BACKEND.replace(/\/$/, "")}/api/menu`;
  }
  return `/api/menu`;
}

/**
 * fetchMenu
 * - returns a MenuResponse object. On error returns { ok: false, modules: [], items: [] }
 * - returns cached value quickly if available (sessionStorage), and triggers background refresh
 */
export async function fetchMenu(): Promise<MenuResponse> {
  const url = resolveMenuUrl();

  try {
    // fast path: return cached if present, but kick off background refresh
    const cached = typeof window !== "undefined" ? sessionStorage.getItem(MENU_CACHE_KEY) : null;
    if (cached) {
      // background refresh (non-blocking)
      fetchWithRetries<MenuResponse>(url, { credentials: "include", headers: { Accept: "application/json" } }, 1)
        .then((fresh) => {
          if (fresh?.ok) {
            try {
              sessionStorage.setItem(MENU_CACHE_KEY, JSON.stringify(fresh));
            } catch {}
          }
        })
        .catch(() => {});
      // return cached immediately
      return JSON.parse(cached) as MenuResponse;
    }

    // no cache -> fetch and cache
    const data = await fetchWithRetries<MenuResponse>(url, { credentials: "include", headers: { Accept: "application/json" } }, 1);
    if (data?.ok) {
      try {
        sessionStorage.setItem(MENU_CACHE_KEY, JSON.stringify(data));
      } catch {}
    }
    return data;
  } catch (err) {
    console.error("[fetchMenu] failed:", err);
    return { ok: false, modules: [], items: [] };
  }
}

export function clearMenuCache() {
  try {
    if (typeof window !== "undefined") sessionStorage.removeItem(MENU_CACHE_KEY);
  } catch {}
}
