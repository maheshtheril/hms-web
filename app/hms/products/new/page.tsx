// app/hms/products/new/page.tsx
"use client";

import React, { useState } from "react";
import apiClient from "@/lib/api-client";
import { useRouter } from "next/navigation";

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

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = { name, sku, price: price === "" ? null : Number(price) };
      const res = await apiClient.post("/products", payload);
      const data = res?.data;
      // navigate to created product if API returns id
      const id = data?.id ?? data?.product?.id;
      if (id) {
        router.push(`/hms/products/${id}`);
        return;
      }
      // otherwise navigate to list
      router.push("/hms/products");
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg || "Failed to create product");
      // keep on page so user can retry
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">New Product</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-4 bg-white/4 p-6 rounded-lg">
        {error && <div className="text-sm text-red-600 p-2 bg-red-50 rounded">{error}</div>}

        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded border" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">SKU</label>
          <input value={sku} onChange={(e) => setSku(e.target.value)} className="w-full px-3 py-2 rounded border" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Price</label>
          <input
            value={price}
            onChange={(e) => {
              const v = e.target.value;
              setPrice(v === "" ? "" : Number(v));
            }}
            type="number"
            step="0.01"
            className="w-full px-3 py-2 rounded border"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create Product"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/hms/products")}
            className="px-4 py-2 bg-gray-600 text-white rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
