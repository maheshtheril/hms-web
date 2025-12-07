// usePOSBatches.ts
// POS V2 batch engine: fetch batches, validate stock, auto-select default batch,
// sort by expiry, and return batch meta for UI.

import { useCallback, useState } from "react";

export interface BatchRecord {
  id: string;
  batch_number: string;
  expiry: string | null;
  available_qty: number;
}

export interface UsePOSBatchesResult {
  loading: boolean;
  error: string | null;
  batches: BatchRecord[];

  fetchBatches: (productId: string) => Promise<BatchRecord[]>;
  getBestBatch: (list: BatchRecord[]) => BatchRecord | null;
  validateQty: (qty: number, batch: BatchRecord | null) => string | null;
}

export function usePOSBatches(): UsePOSBatchesResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchRecord[]>([]);

  /** ---------------------------------------------------------
   * Fetch all batches for a product
   * --------------------------------------------------------- */
  const fetchBatches = useCallback(async (productId: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/hms/products/${productId}/batches`, {
        credentials: "include",
      });

      const j = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(j?.error || j?.message || "Failed to load batches");
      }

      const data: BatchRecord[] = j?.data || [];

      // sort by earliest expiry → latest
      const sorted = [...data].sort((a, b) => {
        if (!a.expiry) return 1;
        if (!b.expiry) return -1;
        return new Date(a.expiry).getTime() - new Date(b.expiry).getTime();
      });

      setBatches(sorted);
      return sorted;
    } catch (err: any) {
      setError(err.message);
      setBatches([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /** ---------------------------------------------------------
   * Always choose the “best” batch for auto-add:
   * - non-expired first
   * - earliest expiry first
   * - highest available stock fallback
   * --------------------------------------------------------- */
  const getBestBatch = useCallback((list: BatchRecord[]): BatchRecord | null => {
    if (!list || list.length === 0) return null;

    // remove expired ones first
    const now = Date.now();
    const valid = list.filter((b) => {
      if (!b.expiry) return true;
      return new Date(b.expiry).getTime() >= now;
    });

    if (valid.length > 0) return valid[0];

    // fallback: allow expired but pick max stock
    return list.sort((a, b) => b.available_qty - a.available_qty)[0];
  }, []);

  /** ---------------------------------------------------------
   * Validate batch quantity before reserve
   * --------------------------------------------------------- */
  const validateQty = useCallback(
    (qty: number, batch: BatchRecord | null): string | null => {
      if (!batch) return "No batch selected";

      if (qty <= 0) return "Quantity must be at least 1";

      if (batch.available_qty <= 0) return "Batch out of stock";

      if (qty > batch.available_qty)
        return `Only ${batch.available_qty} available in this batch`;

      return null;
    },
    []
  );

  return {
    loading,
    error,
    batches,

    fetchBatches,
    getBestBatch,
    validateQty,
  };
}
