// posv2/hooks/index.ts
// Barrel file — explicit type re-exports to avoid duplicate-export ambiguity.

export type { ProductRecord, BatchRecord, CartLine, PrescriptionLine } from "../types";

export * from "./useCart";
export * from "./useReservation";
export * from "./useBatch";
export * from "./usePrescription";

// NOTE: usePOSProducts should export runtime hooks (not types).
// Re-export its runtime exports (hooks, functions) but NOT types here.
export * from "./usePOSProducts";
