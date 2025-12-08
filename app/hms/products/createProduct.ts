// frontend helper - full file
// file: app/hms/products/createProduct.ts
import apiClient from "@/lib/api-client"; // your existing axios/fetch wrapper
import { v4 as uuidv4 } from "uuid";

/**
 * createProduct
 * - payload: product create body
 * - initialStock: optional object { qty, batch_no?, expiry?, cost?, mrp?, vendor_barcode?, internal_barcode?, location?, metadata? }
 * - opts.retry: number of retry attempts on network failure (default 1)
 *
 * Returns created product object from server (including seeded batches if provided).
 */
export default async function createProduct(payload: {
  sku: string;
  name: string;
  company_id: string;
  description?: string;
  price?: number;
  currency?: string;
  is_stockable?: boolean;
  is_service?: boolean;
  uom?: string;
  valuation_method?: string;
  default_cost?: number;
  metadata?: any;
  initial_stock?: {
    qty: number;
    batch_no?: string;
    expiry?: string; // ISO date
    cost?: number;
    mrp?: number;
    vendor_barcode?: string;
    internal_barcode?: string;
    location?: string;
    metadata?: any;
  } | null;
}, opts: { retry?: number } = {}) {
  const attemptRetry = typeof opts.retry === "number" ? opts.retry : 1;

  // generate idempotency key. Use crypto.randomUUID if available (modern browsers).
  const idempotencyKey = (typeof (globalThis as any).crypto?.randomUUID === "function")
    ? (globalThis as any).crypto.randomUUID()
    : uuidv4();

  const doRequest = async () => {
    // use your apiClient — expect it to accept headers
    const headers = { "Idempotency-Key": idempotencyKey };
    // prefer POST to /api/hms/products (server route)
    const res = await apiClient.post("/hms/products", payload, { headers });
    return res.data;
  };

  let lastErr: any = null;
  for (let attempt = 0; attempt <= attemptRetry; attempt++) {
    try {
      return await doRequest();
    } catch (err: any) {
      lastErr = err;
      // network errors: retry; server errors: don't retry (assume idempotency will replay)
      const status = err?.response?.status;
      const isNetwork = !err?.response;
      if (!isNetwork) {
        // If server returned 409 duplicate_sku, bubble it up immediately
        if (status === 409) throw err;
        // For other 4xx/5xx errors don't retry client-side beyond attemptRetry
        throw err;
      }
      // otherwise network error -> retry if attempts left
      if (attempt < attemptRetry) {
        // small backoff
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr;
}
