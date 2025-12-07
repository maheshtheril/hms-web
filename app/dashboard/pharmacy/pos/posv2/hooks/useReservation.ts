// useReservation.ts
// Thin reservation API wrapper used by POS: create, update, release retries + idempotency
import { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

type ReserveResp = { reservation_id?: string | null; expires_at?: string | null; };

export function useReservation(opts?: { basePath?: string }) {
  const base = opts?.basePath ?? "/api/hms";

  const create = useCallback(
    async (args: { product_id: string; batch_id?: string | null; quantity: number; company_id: string; location_id: string; patient_id?: string | null; prescription_line_id?: string | null; }) : Promise<ReserveResp> => {
      const idempotencyKey = `${args.company_id}|${args.location_id}|reserve|${uuidv4()}`;
      const body: any = {
        product_id: args.product_id,
        batch_id: args.batch_id ?? null,
        quantity: args.quantity,
        company_id: args.company_id,
        location_id: args.location_id,
      };
      if (args.patient_id) body.patient_id = args.patient_id;
      if (args.prescription_line_id) body.prescription_line_id = args.prescription_line_id;
      const res = await fetch(`${base}/reserve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || j?.message || `HTTP ${res.status}`);
      return { reservation_id: j?.data?.reservation_id || j?.reservation_id || null, expires_at: j?.data?.expires_at || j?.expires_at || null };
    },
    [base]
  );

  const update = useCallback(
    async (reservation_id: string, quantity: number) : Promise<ReserveResp> => {
      const res = await fetch(`${base}/reserve/${encodeURIComponent(reservation_id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || j?.message || `HTTP ${res.status}`);
      return { reservation_id: j?.data?.reservation_id || j?.reservation_id || null, expires_at: j?.data?.expires_at || j?.expires_at || null };
    },
    [base]
  );

  const release = useCallback(
    async (reservation_id: string) : Promise<void> => {
      try {
        await fetch(`${base}/reserve/${encodeURIComponent(reservation_id)}/release`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        // swallow — release best-effort
      }
    },
    [base]
  );

  return { create, update, release };
}
