// web/lib/api.ts
// Universal API helper — works in local dev and deployed environments.

function resolveApiBase() {
  // 1️⃣ If explicitly provided, use it
  const envBase = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envBase) return envBase.replace(/\/$/, "");

  // 2️⃣ In the browser, use same-origin `/api`
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }

  // 3️⃣ Server-side (local dev): fallback to local backend
  return "http://localhost:4000/api";
}

export const API_BASE = resolveApiBase();

export async function api<T = any>(path: string, init: RequestInit = {}) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE}${p}`;

  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });

  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {}
    throw new Error(`API ${res.status} ${res.statusText}${body ? ` – ${body}` : ""}`);
  }

  return res.json() as Promise<T>;
}
