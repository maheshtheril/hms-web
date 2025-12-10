// web/app/(pos-logic)/useBatchAllocator.ts
"use client";

export default function useBatchAllocator() {
  async function allocate(productId: string, qty: number, strategy = "FEFO") {
    const r = await fetch("/api/stock/allocate", {
      method: "POST",
      body: JSON.stringify({
        product_id: productId,
        quantity: qty,
        strategy,
      }),
      headers: { "Content-Type": "application/json" },
    });

    return r.json();
  }

  async function commit(productId: string, allocation: any[], reference: string) {
    const r = await fetch("/api/stock/commit", {
      method: "POST",
      body: JSON.stringify({
        product_id: productId,
        allocation,
        reference,
      }),
      headers: { "Content-Type": "application/json" },
    });

    return r.json();
  }

  return { allocate, commit };
}
