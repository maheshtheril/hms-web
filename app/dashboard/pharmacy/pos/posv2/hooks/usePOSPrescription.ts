// usePOSPrescription.ts
// Enterprise-grade prescription parser + product mapper + auto-reserver
// Integrates with: usePOSProducts (types), usePOSReservations (runtime), usePOSCart (runtime)

// Note: keep all runtime-only imports separate from `import type` to avoid TS runtime/type confusion.

import { useCallback, useState } from "react";
import { v4 as uuidv4 } from "uuid";

// Types should live in a central file — adjust the path to your repo layout if necessary.
import type { ProductRecord, CartLine } from "../types";
import type { ReservationResponse } from "./usePOSReservations";

export interface PrescriptionLine {
  id?: string | null;
  product_name: string;
  qty?: number;
  note?: string | null;
  suggested_product_ids?: string[];
}

export interface AddLineToCartPayload {
  id: string;
  product_id: string;
  batch_id: string | null;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_amount: number;
  name: string;
  sku?: string;
  reservation_id: string | null;
  reservation_expires_at: string | null;
  prescription_line_id: string | null;
}

export interface UsePOSPrescriptionResult {
  loading: boolean;
  error: string | null;

  /**
   * Main function: processes & adds all lines to cart
   *
   * - lines: parsed prescription lines
   * - opts: context + reserver function (provided by caller)
   * - addToCart: callback that the hook uses to append the final CartLine to POS UI
   */
  addPrescriptionLines: (
    lines: PrescriptionLine[],
    opts: {
      patientId?: string | null;
      companyId: string;
      locationId: string;
      // reserve should be provided by caller (it encapsulates company/location auth + idempotency)
      reserve: (
        productId: string,
        batchId: string | null,
        qty: number,
        reserveOpts: { companyId: string; locationId: string; patientId?: string | null },
        prescription_line_id?: string | null
      ) => Promise<ReservationResponse>;
    },
    // addToCart receives the fully-formed line payload and is expected to insert into cart (synchronous)
    addToCart: (line: AddLineToCartPayload) => void
  ) => Promise<void>;
}

/**
 * Production-ready hook to add prescription lines into POS:
 * - Resolves product IDs via multiple strategies
 * - Fetches product details for pricing
 * - Calls provided `reserve` function to reserve stock
 * - Calls `addToCart` callback with final payload
 */
export function usePOSPrescription(): UsePOSPrescriptionResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ----- Helpers: resolution strategies -----

  async function resolveProductId(line: PrescriptionLine): Promise<string | null> {
    // 1) Suggested ids from parser/backend
    if (line.suggested_product_ids && line.suggested_product_ids.length > 0) {
      return line.suggested_product_ids[0];
    }

    // 2) Medication normalization endpoint (if available)
    try {
      if (line.product_name && line.product_name.trim()) {
        const q = encodeURIComponent(line.product_name.trim());
        const res = await fetch(`/api/hms/medications/normalize?q=${q}`, { credentials: "include" });
        if (res.ok) {
          const j = await res.json().catch(() => null);
          if (j?.data && Array.isArray(j.data) && j.data.length > 0) {
            const p = j.data[0];
            return p.product_id || p.id || null;
          }
        }
      }
    } catch (e) {
      // swallow — fallback to product search
      console.warn("medications normalize failed", e);
    }

    // 3) Direct product search
    try {
      if (line.product_name && line.product_name.trim()) {
        const q = encodeURIComponent(line.product_name.trim());
        const res = await fetch(`/api/hms/products?q=${q}`, { credentials: "include" });
        if (res.ok) {
          const j = await res.json().catch(() => null);
          if (j?.data && Array.isArray(j.data) && j.data.length > 0) {
            return j.data[0].id || null;
          }
        }
      }
    } catch (e) {
      console.warn("product search failed", e);
    }

    return null;
  }

  async function fetchProduct(productId: string): Promise<ProductRecord | null> {
    if (!productId) return null;
    try {
      const res = await fetch(`/api/hms/products/${encodeURIComponent(productId)}`, { credentials: "include" });
      if (!res.ok) return null;
      const j = await res.json().catch(() => null);
      return (j?.data as ProductRecord) ?? null;
    } catch (e) {
      console.warn("fetchProduct failed", e);
      return null;
    }
  }

  // ----- Main driver -----
  const addPrescriptionLines = useCallback(
    async (
      lines: PrescriptionLine[],
      opts: {
        patientId?: string | null;
        companyId: string;
        locationId: string;
        reserve: (
          productId: string,
          batchId: string | null,
          qty: number,
          reserveOpts: { companyId: string; locationId: string; patientId?: string | null },
          prescription_line_id?: string | null
        ) => Promise<ReservationResponse>;
      },
      addToCart: (line: AddLineToCartPayload) => void
    ) => {
      const { patientId, companyId, locationId, reserve } = opts;

      setLoading(true);
      setError(null);

      try {
        // Defensive: normalize inputs
        const safeLines = Array.isArray(lines) ? lines : [];

        for (const ln of safeLines) {
          try {
            const qty = Math.max(1, Math.floor(ln.qty ?? 1));

            // 1) Resolve product ID
            const productId = await resolveProductId(ln);

            // 2) If unresolved → add unmapped fallback line (no reservation)
            if (!productId) {
              addToCart({
                id: uuidv4(),
                product_id: `__unmapped__:${ln.product_name}:${Date.now()}`,
                batch_id: null,
                quantity: qty,
                unit_price: 0,
                tax_rate: 0,
                discount_amount: 0,
                name: ln.product_name,
                sku: undefined,
                reservation_id: null,
                reservation_expires_at: null,
                prescription_line_id: ln.id ?? null,
              });
              continue;
            }

            // 3) Fetch product details
            const prod = await fetchProduct(productId);

            // 4) If product missing (odd), still push fallback mapped line
            if (!prod) {
              addToCart({
                id: uuidv4(),
                product_id: productId,
                batch_id: null,
                quantity: qty,
                unit_price: 0,
                tax_rate: 0,
                discount_amount: 0,
                name: ln.product_name,
                sku: undefined,
                reservation_id: null,
                reservation_expires_at: null,
                prescription_line_id: ln.id ?? null,
              });
              continue;
            }

            // 5) Select batch (prefer default_batch_id). In future you can call /batches to let user choose.
            const batch_id = prod.default_batch_id ?? null;

            // 6) Attempt reservation — caller supplies reservation function which must implement idempotency and auth
            let reservation: ReservationResponse | null = null;
            try {
              reservation = await reserve(
                productId,
                batch_id,
                qty,
                { companyId, locationId, patientId: patientId ?? null },
                ln.id ?? null
              );
            } catch (reserveErr) {
              // reservation failed: continue and add line without reservation_id (UI will show unreserved)
              console.warn("reservation failed for", productId, reserveErr);
              reservation = null;
            }

            // 7) Compose final payload and add to cart
            addToCart({
              id: uuidv4(),
              product_id: productId,
              batch_id,
              quantity: qty,
              unit_price: prod.price ?? 0,
              tax_rate: prod.tax_rate ?? 0,
              discount_amount: 0,
              name: prod.name ?? ln.product_name,
              sku: prod.sku,
              reservation_id: reservation?.reservation_id ?? null,
              reservation_expires_at: reservation?.expires_at ?? null,
              prescription_line_id: ln.id ?? null,
            });
          } catch (innerErr: any) {
            // Don't fail the entire batch if one line fails — surface an error and continue
            console.warn("failed to process prescription line", ln, innerErr);
            setError((prev) => prev ? `${prev}; ${innerErr?.message ?? "line_failed"}` : (innerErr?.message ?? "line_failed"));
          }
        }
      } catch (err: any) {
        setError(err?.message ?? "Failed to add prescription items");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    addPrescriptionLines,
  };
}
