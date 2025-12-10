// web/app/hms/products/page.tsx (or the file you pasted earlier)
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetcher } from "./api";

export default function ProductListPage() {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetcher("/api/products");
        if (!mounted) return;
        setData(r);
      } catch (err: any) {
        console.error("Failed to load products:", err);
        if (!mounted) return;
        setError(err?.message || "Failed to load products");
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
  if (error) return <div className="p-10 text-red-600">Error: {error}</div>;
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
