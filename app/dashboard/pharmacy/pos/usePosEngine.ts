"use client";

import { useState } from "react";
import useBatchAllocator from "@/app/(pos-logic)/useBatchAllocator";

export default function usePosEngine() {
  const { allocate, commit } = useBatchAllocator();

  const [cart, setCart] = useState<any[]>([]);

  async function addProduct(p: any, qty: number = 1) {
    // Step 1: allocate FEFO batches
    const r = await allocate(p.id, qty, "FEFO");

    if (!r.ok) {
      alert(r.error);
      return;
    }

    // Step 2: add to cart
    setCart((s) => [
      ...s,
      {
        id: crypto.randomUUID(),
        product: p,
        qty,
        allocation: r.allocation,
      },
    ]);
  }

  async function checkout(invoiceId: string) {
    for (const item of cart) {
      await commit(
        item.product.id,
        item.allocation,
        invoiceId
      );
    }
    setCart([]);
    return { ok: true };
  }

  return {
    cart,
    addProduct,
    checkout,
  };
}
