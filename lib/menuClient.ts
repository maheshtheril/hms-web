// web/lib/menuClient.ts
const MENU_CACHE_KEY = "erp:menu:v1";
const COMPANIES_CACHE_KEY = "erp:companies:v1";
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RETRIES = 1;

/** Abortable fetch with timeout */
async function timeoutFetch(input: RequestInfo, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT) {
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

/** Simple retry wrapper */
async function fetchWithRetries<T>(url: string, init: RequestInit = {}, retries = DEFAULT_RETRIES, timeoutMs = DEFAULT_TIMEOUT): Promise<T> {
  let lastErr: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await timeoutFetch(url, init, timeoutMs);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${body ? `: ${body.slice(0, 200)}` : ""}`);
      }
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        return (await res.json()) as T;
      }
      // fallback
      const text = await res.text();
      // @ts-ignore
      return JSON.parse(text) as T;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr;
}

/** fetchMenu - returns MenuResponse or null */
export async function fetchMenu(): Promise<MenuResponse | null> {
  const url = `/api/menu`;
  try {
    // fast path: return cached immediately if present
    const cached = sessionStorage.getItem(MENU_CACHE_KEY);
    if (cached) {
      // kick off background refresh (non-blocking)
      fetchWithRetries<MenuResponse>(url, { credentials: "include" }, 1).then((fresh) => {
        if (fresh?.ok) sessionStorage.setItem(MENU_CACHE_KEY, JSON.stringify(fresh));
      }).catch(() => {});
      return JSON.parse(cached) as MenuResponse;
    }

    // no cache -> fetch and store
    const data = await fetchWithRetries<MenuResponse>(url, { credentials: "include" }, 1);
    if (data?.ok) sessionStorage.setItem(MENU_CACHE_KEY, JSON.stringify(data));
    return data;
  } catch (err) {
    console.error("fetchMenu failed", err);
    return null;
  }
}

/** fetchCompanies - returns array or null */
export async function fetchCompanies(): Promise<any[] | null> {
  const url = `/api/user/companies`;
  try {
    const cached = sessionStorage.getItem(COMPANIES_CACHE_KEY);
    if (cached) {
      fetchWithRetries<any[]>(url, { credentials: "include" }, 1).then((fresh) => {
        if (Array.isArray(fresh)) sessionStorage.setItem(COMPANIES_CACHE_KEY, JSON.stringify(fresh));
      }).catch(() => {});
      return JSON.parse(cached) as any[];
    }

    const data = await fetchWithRetries<any[]>(url, { credentials: "include" }, 1);
    if (Array.isArray(data)) sessionStorage.setItem(COMPANIES_CACHE_KEY, JSON.stringify(data));
    return data;
  } catch (err) {
    console.error("fetchCompanies failed", err);
    return null;
  }
}

export function clearMenuCache() {
  try { sessionStorage.removeItem(MENU_CACHE_KEY); } catch {}
}
export function clearCompaniesCache() {
  try { sessionStorage.removeItem(COMPANIES_CACHE_KEY); } catch {}
}
