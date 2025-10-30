"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import ProductForm from "./ProductForm";
import ReceiveForm from "./ReceiveForm";
import SellWithBarcode from "./SellWithBarcode";
import { useRouter } from "next/navigation";
import CompanySelector from "@/components/CompanySelector";
import { useCompany } from "@/app/providers/CompanyProvider";

type Product = {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  is_stockable?: boolean;
  metadata?: any;
};

export default function ProductsPage() {
  const toast = useToast();
  const router = useRouter();
  const { company } = useCompany();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  // advanced modals
  const [showReceiveModalFor, setShowReceiveModalFor] = useState<{ productId: string; companyId: string } | null>(null);
  const [showSellModalFor, setShowSellModalFor] = useState<{ productId?: string; companyId: string } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  async function fetchProducts() {
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      if (!company) {
        setProducts([]);
        setLoading(false);
        toast.info("Please select a company to load products.");
        return;
      }
      const params = new URLSearchParams();
      if (query) params.append("q", query);
      params.append("company_id", company.id);

      const res = await apiClient.get(`/hms/products?${params.toString()}`, { signal: abortRef.current.signal });
      setProducts(res.data?.data ?? []);
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.message === "canceled") return;
      console.error("fetchProducts", err);
      toast.error(err?.message ?? "Failed to load products", "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProducts(); return () => abortRef.current?.abort(); /* eslint-disable-next-line */ }, [company]);

  function openCreate() { setEditing(null); setShowForm(true); }
  function openEdit(p: Product) { setEditing(p); setShowForm(true); }
  function view(id: string) { router.push(`/hms/products/${encodeURIComponent(id)}`); }

  function receive(productId: string) {
    if (!company) return toast.error("Select a company first");
    setShowReceiveModalFor({ productId, companyId: company.id });
  }

  function sell(productId?: string) {
    if (!company) return toast.error("Select a company first");
    setShowSellModalFor({ productId, companyId: company.id });
  }

  async function remove(p: Product) {
    if (!confirm(`Delete product ${p.name} (${p.sku})?`)) return;
    try {
      // backend requires company_id for delete
      await apiClient.delete(`/hms/products/${encodeURIComponent(p.id)}`, { data: { company_id: company!.id } });
      toast.success("Deleted", "Success");
      await fetchProducts();
    } catch (err: any) {
      console.error("delete product", err);
      toast.error(err?.message ?? "Delete failed");
    }
  }

  return (
    <div className="min-h-screen p-8">
      <motion.header initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-sm text-slate-500">Catalog — SKU, stock & batch management</p>
          </div>
          <div className="ml-4">
            <CompanySelector />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={openCreate} className="px-4 py-2 rounded-xl bg-blue-600 text-white">New Product</button>
          <button onClick={() => fetchProducts()} className="px-3 py-2 rounded-xl border">Refresh</button>
          <button onClick={() => sell(undefined)} className="px-3 py-2 rounded-xl bg-amber-600 text-white">Sell (scan)</button>
        </div>
      </motion.header>

      <div className="max-w-6xl mx-auto space-y-4">
        <div className="p-3 rounded-2xl bg-white/80 backdrop-blur-md flex items-center gap-2">
          <input placeholder="Search name or SKU" value={query} onChange={(e)=>setQuery(e.target.value)} className="px-3 py-2 rounded-xl border flex-1" />
          <button onClick={()=>fetchProducts()} className="px-3 py-2 rounded-xl bg-blue-600 text-white">Search</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && <div className="text-center p-6">Loading...</div>}
          {!loading && products.length === 0 && <div className="p-6 text-center text-slate-500">{company ? "No products found" : "No company selected"}</div>}
          {products.map(p => (
            <motion.div key={p.id} whileHover={{ scale: 1.01 }} className="p-4 rounded-2xl bg-white border">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.sku}</div>
                </div>
                <div className="text-sm text-slate-600">{p.price ? `${Number(p.price).toFixed(2)} ${p.currency ?? 'USD'}` : "—"}</div>
              </div>

              <div className="mt-2 text-sm text-slate-600">{p.description ?? ""}</div>

              <div className="mt-3 flex gap-2">
                <button onClick={()=>view(p.id)} className="px-3 py-1 rounded-xl border">View</button>
                <button onClick={()=>openEdit(p)} className="px-3 py-1 rounded-xl border">Edit</button>
                <button onClick={()=>receive(p.id)} className="px-3 py-1 rounded-xl bg-emerald-600 text-white">Receive</button>
                <button onClick={()=>sell(p.id)} className="px-3 py-1 rounded-xl bg-amber-600 text-white">Sell</button>
                <button onClick={()=>remove(p)} className="px-3 py-1 rounded-xl bg-rose-600 text-white">Delete</button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {showForm && <ProductForm initial={editing ?? undefined} onClose={() => { setShowForm(false); setEditing(null); fetchProducts(); }} onSaved={async ()=>{ await fetchProducts(); toast.success("Saved", "Saved"); }} />}

      {showReceiveModalFor && (
        <ReceiveForm
          productId={showReceiveModalFor.productId}
          companyId={showReceiveModalFor.companyId}
          onClose={() => setShowReceiveModalFor(null)}
          onReceived={async ()=>{ await fetchProducts(); toast.success("Received"); }}
        />
      )}

      {showSellModalFor && (
        <SellWithBarcode
          companyId={showSellModalFor.companyId}
          onClose={() => setShowSellModalFor(null)}
          onSold={async ()=>{ await fetchProducts(); toast.success("Sold"); }}
        />
      )}
    </div>
  );
}
