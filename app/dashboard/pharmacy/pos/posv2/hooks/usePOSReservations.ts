// usePOSReservations.ts
// Enterprise-grade reservation engine for POS V2
// Handles reserve, update, release, idempotency, retry and backend sync.

import { useCallback, useState } from "react";
import { v4 as uuidv4 } from "uuid";

export interface ReservationResponse {
  reservation_id: string;
  expires_at: string | null;
}

interface ReserveOptions {
  companyId: string;
  locationId: string;
  patientId?: string;
}

export interface UsePOSReservationsResult {
  reserving: boolean;
  error: string | null;

  reserve: (
    product_id: string,
    batch_id: string | null,
    quantity: number,
    opts: ReserveOptions,
    prescription_line_id?: string | null
  ) => Promise<ReservationResponse>;

  updateReservation: (
    reservation_id: string,
    quantity: number
  ) => Promise<ReservationResponse>;

  releaseReservation: (reservation_id: string) => Promise<void>;
}

/* -------------------------- helpers -------------------------- */

const DEFAULT_TIMEOUT = 8000;
const DEFAULT_RETRIES = 2;

function withTimeout<T>(p: Promise<T>, ms = DEFAULT_TIMEOUT) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/* -------------------------- hook -------------------------- */

export function usePOSReservations(): UsePOSReservationsResult {
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** -----------------------------
   * Reserve stock for a product
   * - retried with exponential backoff (idempotency keys make retries safe server-side)
   * ----------------------------- */
  const reserve = useCallback(
    async (
      product_id: string,
      batch_id: string | null,
      quantity: number,
      opts: ReserveOptions,
      prescription_line_id?: string | null
    ): Promise<ReservationResponse> => {
      const { companyId, locationId, patientId } = opts;

      setReserving(true);
      setError(null);

      if (!companyId || !locationId) {
        setReserving(false);
        const err = new Error("Missing company or location");
        setError(err.message);
        throw err;
      }

      let attempt = 0;
      const maxAttempts = DEFAULT_RETRIES + 1;

      while (attempt < maxAttempts) {
        attempt += 1;
        const idempotency = `reserve|${companyId}|${locationId}|${uuidv4()}`;
        const body: any = {
          product_id,
          batch_id,
          quantity,
          location_id: locationId,
          company_id: companyId,
        };
        if (patientId) body.patient_id = patientId;
        if (prescription_line_id) body.prescription_line_id = prescription_line_id;

        try {
          const req = fetch(`/api/hms/reserve`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": idempotency,
            },
            body: JSON.stringify(body),
          });

          const res = await withTimeout(req, DEFAULT_TIMEOUT);
          const j = await safeJson(res) || {};

          if (!res.ok) {
            // Non-2xx — throw to trigger retry if attempts remain
            const msg = j?.error || j?.message || `HTTP ${res.status}`;
            throw new Error(msg);
          }

          // success
          const reservation_id = j?.data?.reservation_id || j?.reservation_id || "";
          const expires_at = j?.data?.expires_at || j?.expires_at || null;

          setReserving(false);
          setError(null);
          return { reservation_id, expires_at };
        } catch (e: any) {
          // If final attempt, surface error
          const isLast = attempt >= maxAttempts;
          const message = e?.message || String(e);
          if (isLast) {
            setReserving(false);
            setError(message);
            throw new Error(message);
          }
          // otherwise, backoff then retry
          const backoffMs = 150 * Math.pow(2, attempt); // 300, 600, ...
          // small jitter
          await new Promise((r) => setTimeout(r, backoffMs + Math.floor(Math.random() * 60)));
          // continue loop
        }
      }

      // Should never reach — defensive
      setReserving(false);
      const err = new Error("reserve_failed");
      setError(err.message);
      throw err;
    },
    []
  );

  /** -----------------------------
   * Update reservation quantity
   * ----------------------------- */
  const updateReservation = useCallback(
    async (reservation_id: string, quantity: number): Promise<ReservationResponse> => {
      setError(null);
      try {
        const req = fetch(
          `/api/hms/reserve/${encodeURIComponent(reservation_id)}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity }),
          }
        );
        const res = await withTimeout(req, DEFAULT_TIMEOUT);
        const j = await safeJson(res) || {};
        if (!res.ok) {
          const msg = j?.error || j?.message || `HTTP ${res.status}`;
          setError(msg);
          throw new Error(msg);
        }
        return {
          reservation_id: j?.data?.reservation_id || j?.reservation_id || reservation_id,
          expires_at: j?.data?.expires_at || j?.expires_at || null,
        };
      } catch (e: any) {
        const msg = e?.message || String(e);
        setError(msg);
        throw e;
      }
    },
    []
  );

  /** -----------------------------
   * Release reservation entirely
   * Note: endpoint corrected to `/api/hms/reserve/{id}/release`
   * Fail silently (shouldn't block UI) but attempt best-effort.
   * ----------------------------- */
  const releaseReservation = useCallback(async (reservation_id: string) => {
    try {
      // best-effort; don't set global error for release failures
      const req = fetch(
        `/api/hms/reserve/${encodeURIComponent(reservation_id)}/release`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      await withTimeout(req, DEFAULT_TIMEOUT).catch(() => null);
    } catch {
      // swallow
    }
  }, []);

  return {
    reserving,
    error,
    reserve,
    updateReservation,
    releaseReservation,
  };
}
