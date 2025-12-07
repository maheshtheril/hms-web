// /app/dashboard/pharmacy/pos/posv2/hooks/usePOSProducts.ts
// NOTE: this file must NOT declare or export ProductRecord / BatchRecord types.
// Ensure ../types exports them.

import type { ProductRecord, BatchRecord } from "../types";

/**
 * POS product helpers:
 * - searchProducts(query, { signal, timeoutMs })
 * - getProduct(productId, { timeoutMs })
 * - getBatches(productId, { timeoutMs })
 *
 * All functions are resilient and will return empty results on error (caller can choose to show error).
 */

const DEFAULT_TIMEOUT = 8000;

function withTimeout<T>(p: Promise<T>, ms: number) {
  let t: any;
  const timer = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error("timeout")), ms);
  });
  return Promise.race([p, timer]).finally(() => clearTimeout(t));
}

export function usePOSProducts() {
  async function searchProducts(
    query: string,
    opts?: { signal?: AbortSignal; timeoutMs?: number }
  ): Promise<ProductRecord[]> {
    if (!query || !query.trim()) return [];
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT;
    const url = `/api/hms/products?q=${encodeURIComponent(query)}`;

    try {
      const controller = new AbortController();
      const signal = opts?.signal ?? controller.signal;

      const req = fetch(url, { credentials: "include", signal });
      const res = await withTimeout(req, timeoutMs);

      if (!res.ok) {
        console.warn("searchProducts non-OK", res.status, await safeText(res));
        return [];
      }
      const j = await res.json().catch(() => null);
      return (j?.data as ProductRecord[]) || [];
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // aborted by caller — not an actual error to log spammy
        return [];
      }
      console.warn("searchProducts error", err);
      return [];
    }
  }

  async function getProduct(
    productId: string,
    opts?: { timeoutMs?: number }
  ): Promise<ProductRecord | null> {
    if (!productId) return null;
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT;
    try {
      const req = fetch(`/api/hms/products/${encodeURIComponent(productId)}`, {
        credentials: "include",
      });
      const res = await withTimeout(req, timeoutMs);
      if (!res.ok) {
        console.warn("getProduct non-OK", res.status, await safeText(res));
        return null;
      }
      const j = await res.json().catch(() => null);
      return (j?.data as ProductRecord) ?? null;
    } catch (err: any) {
      console.warn("getProduct error", err);
      return null;
    }
  }

  async function getBatches(
    productId: string,
    opts?: { timeoutMs?: number }
  ): Promise<BatchRecord[]> {
    if (!productId) return [];
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT;
    try {
      const req = fetch(
        `/api/hms/products/${encodeURIComponent(productId)}/batches`,
        { credentials: "include" }
      );
      const res = await withTimeout(req, timeoutMs);
      if (!res.ok) {
        console.warn("getBatches non-OK", res.status, await safeText(res));
        return [];
      }
      const j = await res.json().catch(() => null);
      return (j?.data as BatchRecord[]) || [];
    } catch (err: any) {
      console.warn("getBatches error", err);
      return [];
    }
  }

  return {
    searchProducts,
    getProduct,
    getBatches,
  };
}

/* helpers */
async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "<no-body>";
  }
}
