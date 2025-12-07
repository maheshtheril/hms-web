// useBatch.ts
// Batch helpers: fetch batches for product, safe selection helpers

import { useCallback } from "react";
import type { BatchRecord } from "../types";

export function useBatch(opts?: { basePath?: string }) {
  const base = opts?.basePath ?? "/api/hms";

  const fetchBatches = useCallback(async (productId: string): Promise<BatchRecord[]> => {
    if (!productId) return [];
    const res = await fetch(`${base}/products/${encodeURIComponent(productId)}/batches`, { credentials: "include" });
    if (!res.ok) return [];
    const j = await res.json().catch(() => null);
    return j?.data || [];
  }, [base]);

  const chooseBestBatch = useCallback((batches: BatchRecord[]) => {
    // Opinionated: prefer non-expired, highest available_qty, earliest expiry among equals
    const safeNow = Date.now();
    const valid = batches
      .slice()
      .filter((b) => !b.expiry || new Date(b.expiry).getTime() > safeNow)
      .sort((a, b) => {
        const diff = (b.available_qty - a.available_qty);
        if (diff !== 0) return diff;
        const aT = a.expiry ? new Date(a.expiry).getTime() : Number.MAX_SAFE_INTEGER;
        const bT = b.expiry ? new Date(b.expiry).getTime() : Number.MAX_SAFE_INTEGER;
        return aT - bT;
      });
    return valid[0] ?? null;
  }, []);

  return { fetchBatches, chooseBestBatch };
}
