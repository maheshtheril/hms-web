// web/lib/api.ts — universal helper (safe in client & pages/)
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

/**
 * Universal fetch wrapper that works in client components and the pages/ router.
 * In the browser it will send cookies via credentials: "include".
 * On the server it won't auto-forward cookies; use your own server fetch when needed.
 */
export async function api<T = any>(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch {}
    throw new Error(`API ${res.status} ${res.statusText}${body ? ` – ${body}` : ""}`);
  }
  return res.json() as Promise<T>;
}
