"use client";

import usePosEngine from "./usePosEngine";
import PosItem from "./components/PosItem";
import { useState } from "react";

export default function POSPage() {
  const { cart, addProduct, checkout } = usePosEngine();
  const [productSearch, setProductSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);

  async function searchProducts() {
    const r = await fetch(`/api/products?search=${productSearch}`);
    const json = await r.json();
    setResults(json);
  }

  async function confirmCheckout() {
    const invoiceId = "INV-" + Date.now(); // later: real invoice ID
    await checkout(invoiceId);
    alert("Checkout complete");
  }

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Pharmacy POS</h1>

      {/* SEARCH */}
      <div className="flex gap-3 mb-6">
        <input
          className="px-4 py-3 w-full border rounded-xl bg-white/70"
          placeholder="Search medicines..."
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
        />
        <button
          onClick={searchProducts}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl"
        >
          Search
        </button>
      </div>

      {/* SEARCH RESULTS */}
      {results.length > 0 && (
        <div className="mb-8 space-y-2">
          {results.map((p: any) => (
            <button
              key={p.id}
              onClick={() => addProduct(p, 1)}
              className="w-full text-left p-3 bg-white/60 border rounded-xl shadow-sm hover:bg-white"
            >
              {p.name} <span className="text-gray-500">({p.sku})</span>
            </button>
          ))}
        </div>
      )}

      {/* CART */}
      <div className="space-y-4">
        {cart.map((item) => (
          <PosItem key={item.id} item={item} />
        ))}

        {cart.length > 0 && (
          <button
            onClick={confirmCheckout}
            className="px-6 py-3 bg-green-600 text-white rounded-xl w-full mt-6 shadow-lg"
          >
            Checkout
          </button>
        )}
      </div>
    </div>
  );
}
