// web/lib/api.ts
// ✅ Universal API helper — safe for local + production
// Works with NEXT_PUBLIC_BACKEND_URL or BACKEND_URL env vars

function resolveApiBase(): string {
  // 1️⃣ Prefer public env variables exposed to the browser
  const publicBase =
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();

  if (publicBase) {
    return publicBase.replace(/\/$/, ""); // remove trailing slash
  }

  // 2️⃣ Server-only fallback (in dev builds)
  const serverBase = process.env.BACKEND_URL?.trim();
  if (serverBase) {
    return serverBase.replace(/\/$/, "");
  }

  // 3️⃣ If in browser and no env var, use same-origin
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }

  // 4️⃣ Last resort (shouldn’t happen if env is configured)
  throw new Error(
    "No backend URL configured. Set NEXT_PUBLIC_BACKEND_URL or BACKEND_URL in env."
  );
}

export const API_BASE = resolveApiBase();

export async function api<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
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
    } catch {
      /* ignore */
    }
    throw new Error(
      `API ${res.status} ${res.statusText}${
        body ? ` – ${body}` : ""
      }`
    );
  }

  return res.json() as Promise<T>;
}
