// web/app/hms/products/api.ts
const BASE = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_BACKEND_URL || "" : "";

/**
 * Build a request URL.
 * - If NEXT_PUBLIC_BACKEND_URL is set (production), use `${BASE}${path}`.
 * - Otherwise use the relative path (useful for local dev / proxy).
 */
function buildUrl(path: string) {
  if (!path.startsWith("/")) path = `/${path}`;
  return BASE ? `${BASE}${path}` : path;
}

async function handleRes(res: Response) {
  const text = await res.text();
  // try parse JSON, fallback to text
  let body: any;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    const err = new Error(`API error: ${res.status} ${res.statusText}`);
    // attach helpful debug info
    (err as any).status = res.status;
    (err as any).body = body;
    throw err;
  }
  return body;
}

/** Generic fetcher used by components */
export const fetcher = async (url: string) => {
  const full = buildUrl(url);
  const res = await fetch(full, {
    method: "GET",
    credentials: "include", // important if backend uses cookies/session
    headers: {
      "Accept": "application/json",
    },
  });
  return handleRes(res);
};

/** Read a single product by id */
export async function readProduct(id: string) {
  const full = buildUrl(`/api/products/${id}`);
  const res = await fetch(full, {
    method: "GET",
    credentials: "include",
    headers: { "Accept": "application/json" },
  });
  return handleRes(res);
}

/** Save (create or update) product */
export async function saveProduct(data: any, id?: string) {
  const full = buildUrl(id ? `/api/products/${id}` : "/api/products");
  const res = await fetch(full, {
    method: id ? "PUT" : "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(data),
  });
  return handleRes(res);
}
