// app/hms/products/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";

function getErrorMessage(e: unknown): string {
  if (!e && e !== 0) return String(e);
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  try {
    const anyE = e as any;
    if (anyE?.response?.data?.message) return String(anyE.response.data.message);
    if (anyE?.message) return String(anyE.message);
    return JSON.stringify(anyE);
  } catch {
    return String(e);
  }
}

export default function ProductListPage() {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Use apiClient so cookies are always sent (withCredentials: true)
        // Call the normalized path — apiClient will handle /api normalization.
        const res = await apiClient.get("/products");
        if (!mounted) return;
        const body = res?.data ?? null;
        // Backend might return { items: [] } or the array directly
        const list = Array.isArray(body) ? body : body?.items ?? [];
        setData(list);
      } catch (err) {
        // log minimal debug and surface friendly message
        // eslint-disable-next-line no-console
        console.warn("Products load failed:", getErrorMessage(err));
        if (!mounted) return;
        setError(getErrorMessage(err) || "Failed to load products");
        setData(null);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="p-10">Loading...</div>;
  if (error)
    return (
      <div className="p-10">
        <div className="flex justify-between">
          <h1 className="text-3xl font-bold">Products</h1>
          <Link href="/hms/products/new" className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow">
            New Product
          </Link>
        </div>
        <div className="mt-6 bg-white rounded-xl p-6 shadow-lg text-red-600">Error: {error}</div>
      </div>
    );

  if (!data || data.length === 0)
    return (
      <div className="p-10">
        <div className="flex justify-between">
          <h1 className="text-3xl font-bold">Products</h1>
          <Link href="/hms/products/new" className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow">
            New Product
          </Link>
        </div>
        <div className="mt-6 bg-white rounded-xl p-6 shadow-lg">No products found.</div>
      </div>
    );

  return (
    <div className="p-10">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">Products</h1>
        <Link href="/hms/products/new" className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow">
          New Product
        </Link>
      </div>

      <div className="mt-6 bg-white rounded-xl p-6 shadow-lg">
        {data.map((p: any) => (
          <Link
            key={p.id}
            href={`/hms/products/${p.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer border-b"
          >
            <div>
              <div className="font-semibold">{p.name}</div>
              <div className="text-gray-500 text-sm">{p.sku}</div>
            </div>
            <div className="opacity-60">{p.price}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
