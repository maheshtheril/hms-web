// usePrescription.ts
// Helpers to normalize/parse prescriptions and map to products
import { useCallback } from "react";
import type { PrescriptionLine } from "../types";
import type { ProductRecord } from "../types";

export function usePrescription(opts?: { basePath?: string }) {
  const base = opts?.basePath ?? "/api/hms";

  const normalizeMedication = useCallback(async (q: string) => {
    const res = await fetch(`${base}/medications/normalize?q=${encodeURIComponent(q)}`, { credentials: "include" });
    if (!res.ok) return null;
    const j = await res.json().catch(() => null);
    return j?.data || null;
  }, [base]);

  const mapToProduct = useCallback(async (line: PrescriptionLine): Promise<{ productId?: string | null; product?: ProductRecord | null }> => {
    // 1) suggested_product_ids
    if ((line as any).suggested_product_ids && (line as any).suggested_product_ids.length) {
      const id = (line as any).suggested_product_ids[0];
      const prodRes = await fetch(`${base}/products/${encodeURIComponent(id)}`, { credentials: "include" });
      if (prodRes.ok) {
        const pj = await prodRes.json().catch(() => null);
        return { productId: id, product: pj?.data ?? null };
      }
    }

    // 2) normalize endpoint
    const norm = await normalizeMedication(line.product_name);
    if (norm && Array.isArray(norm) && norm.length) {
      const first = norm[0];
      const pid = first.product_id || first.id;
      if (pid) {
        const p = await fetch(`${base}/products/${encodeURIComponent(pid)}`, { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null);
        return { productId: pid, product: p?.data ?? null };
      }
    }

    // 3) search products
    const search = await fetch(`${base}/products?q=${encodeURIComponent(line.product_name)}`, { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null);
    if (search && Array.isArray(search?.data) && search.data.length) {
      const pid = search.data[0].id;
      const prod = search.data[0];
      return { productId: pid, product: prod };
    }

    return { productId: null, product: null };
  }, [base, normalizeMedication]);

  return { normalizeMedication, mapToProduct };
}
