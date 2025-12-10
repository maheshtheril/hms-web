// app/dashboard/pharmacy/pos/page.tsx
"use client";

import usePosEngine from "./usePosEngine";
import PosItem from "./components/PosItem";
import { useState } from "react";
import apiClient from "@/lib/api-client";

/** Safe error extractor for unknowns (TypeScript-friendly) */
function getErrorMessage(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  try {
    const a = e as any;
    if (a?.response?.data?.message) return String(a.response.data.message);
    if (a?.message) return String(a.message);
    return JSON.stringify(a);
  } catch {
    return String(e);
  }
}

export default function POSPage() {
  const { cart, addProduct, checkout } = usePosEngine();
  const [productSearch, setProductSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function searchProducts() {
    if (!productSearch || productSearch.trim().length < 1) {
      setResults([]);
      setError(null);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      // use apiClient so cookies are sent and baseURL normalization is used
      const res = await apiClient.get("/products", { params: { search: productSearch } });
      const body = res?.data ?? [];
      const list = Array.isArray(body) ? body : body?.items ?? [];
      setResults(list);
    } catch (err) {
      const msg = getErrorMessage(err);
      // eslint-disable-next-line no-console
      console.warn("POS search failed:", msg);
      setError(msg || "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function confirmCheckout() {
    try {
      const invoiceId = "INV-" + Date.now(); // later: real invoice ID
      await checkout(invoiceId);
      // lightweight success feedback
      try {
        // refresh cart state might be handled by usePosEngine; still give user notice
        alert("Checkout complete");
      } catch {}
    } catch (err) {
      const msg = getErrorMessage(err);
      // eslint-disable-next-line no-console
      console.warn("checkout failed:", msg);
      alert("Checkout failed: " + (msg || "unknown error"));
    }
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
          onKeyDown={(e) => {
            if (e.key === "Enter") searchProducts();
          }}
        />
        <button
          onClick={searchProducts}
          disabled={searching}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl disabled:opacity-60"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      {error && <div className="mb-4 text-sm text-red-600">Error: {error}</div>}

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
