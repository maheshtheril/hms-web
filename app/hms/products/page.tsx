"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import ProductForm from "./ProductEditor";
import ReceiveForm from "./ReceiveForm";
import SellWithBarcode from "./SellWithBarcode";
import { useRouter } from "next/navigation";
import CompanySelector from "@/components/CompanySelector";
import { useCompany } from "@/app/providers/CompanyProvider";
import { Search, Plus, RefreshCw, Tag, Edit2, Eye, Trash2, Box, DollarSign } from "lucide-react";

/**
 * ProductsPage — Neural Glass Design Language (TypeScript)
 * Best choice: fully typed, TS-safe, clear AbortController handling, and accessible controls.
 */

type Product = {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  is_stockable?: boolean;
  metadata?: Record<string, any> | null;
};

export default function ProductsPage(): JSX.Element {
  const toast = useToast();
  const router = useRouter();
  const { company } = useCompany();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showReceiveModalFor, setShowReceiveModalFor] = useState<{ productId: string; companyId: string } | null>(null);
  const [showSellModalFor, setShowSellModalFor] = useState<{ productId?: string; companyId: string } | null>(null);

  // <-- Correctly typed AbortController ref so TypeScript is happy
  const abortRef = useRef<AbortController | null>(null);

  const fetchProducts = useCallback(async () => {
    // cancel previous
    try {
      setLoading(true);
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      if (!company) {
        setProducts([]);
        toast.info("Please select a company to load products.");
        return;
      }

      const params = new URLSearchParams();
      if (query) params.append("q", query);
      params.append("company_id", company.id);

      const signal = abortRef.current.signal;
      const res = await apiClient.get(`/hms/products?${params.toString()}`, { signal });
      setProducts((res.data?.data ?? []) as Product[]);
    } catch (err: any) {
      // axios uses 'CanceledError' or DOM AbortError depending on setup
      if (err?.name === "CanceledError" || err?.message === "canceled" || err?.name === 'AbortError') {
        // intentional cancellation — ignore
        return;
      }
      console.error("fetchProducts", err);
      toast.error(err?.message ?? "Failed to load products", "Load failed");
    } finally {
      setLoading(false);
    }
  }, [company, query, toast]);

  useEffect(() => {
    fetchProducts();
    return () => {
      abortRef.current?.abort();
    };
    // fetchProducts is stable thanks to useCallback
  }, [fetchProducts]);

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setShowForm(true);
  };

  const view = (id: string) => {
    router.push(`/hms/products/${encodeURIComponent(id)}`);
  };

  const receive = (productId: string) => {
    if (!company) return toast.error("Select a company first");
    setShowReceiveModalFor({ productId, companyId: company.id });
  };

  const sell = (productId?: string) => {
    if (!company) return toast.error("Select a company first");
    setShowSellModalFor({ productId, companyId: company.id });
  };

  const remove = async (p: Product) => {
    if (!confirm(`Delete product ${p.name} (${p.sku})?`)) return;
    try {
      await apiClient.delete(`/hms/products/${encodeURIComponent(p.id)}`, { data: { company_id: company!.id } });
      toast.success("Deleted", "Success");
      await fetchProducts();
    } catch (err: any) {
      console.error("delete product", err);
      toast.error(err?.message ?? "Delete failed");
    }
  };

  return (
    <div className="relative min-h-screen p-6 lg:p-10 bg-gradient-to-br from-slate-100/70 via-white/60 to-slate-50/70 backdrop-blur-2xl overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-violet-300/20 blur-3xl" />
      </div>

      <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-7xl mx-auto mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="backdrop-blur-xl bg-white/40 border border-white/30 rounded-3xl p-5 shadow-xl">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 drop-shadow-sm">Products</h1>
            <p className="text-sm text-slate-600 mt-1">Your catalog — stock, SKU, and smart batch management</p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white rounded-xl p-2 shadow-sm border z-40">
              <CompanySelector />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-3 flex-1 md:flex-none backdrop-blur-md bg-white/30 border border-white/20 rounded-3xl px-4 py-2 shadow-inner">
            <Search className="w-4 h-4 text-slate-500" />
            <input placeholder="Search name or SKU" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchProducts()} className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400" />
            <button onClick={() => fetchProducts()} className="rounded-xl px-3 py-1 text-sm bg-blue-600/80 hover:bg-blue-600 text-white shadow-md transition-all">Go</button>
          </div>

          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl hover:scale-[1.02] transition-transform">
            <Plus className="w-4 h-4" /> New Product
          </button>
          <button onClick={() => fetchProducts()} className="p-2 rounded-2xl border border-white/30 bg-white/40 shadow-inner hover:bg-white/60" aria-label="Refresh">
            <RefreshCw className="w-4 h-4 text-slate-700" />
          </button>
          <button onClick={() => sell(undefined)} className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:scale-[1.02]">
            <DollarSign className="w-4 h-4 inline-block mr-1" /> Sell (Scan)
          </button>
        </div>
      </motion.header>

      <main className="relative z-10 max-w-7xl mx-auto space-y-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 rounded-3xl bg-white/50 border border-white/20 shadow-inner" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center p-10 backdrop-blur-md bg-white/50 border border-white/30 rounded-3xl shadow-xl text-slate-600">
            {company ? "No products found. Add a new one to get started." : "Please select a company to load products."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((p) => (
              <motion.div key={p.id} whileHover={{ scale: 1.02 }} className="relative p-5 rounded-3xl backdrop-blur-xl bg-white/40 border border-white/20 shadow-lg hover:shadow-2xl transition-all flex flex-col">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 drop-shadow-sm">{p.name}</h2>
                    <p className="text-xs text-slate-500">{p.sku}</p>
                  </div>
                  <div className="text-right text-slate-700 font-semibold">{p.price ? `${Number(p.price).toFixed(2)} ${p.currency ?? 'USD'}` : '—'}</div>
                </div>
                <p className="mt-2 text-sm text-slate-700 line-clamp-3 flex-1">{p.description ?? 'No description provided.'}</p>

                <div className="mt-4 flex justify-between items-center">
                  <div className="flex gap-2">
                    <button onClick={() => view(p.id)} className="px-3 py-1 rounded-xl backdrop-blur-md bg-white/50 border border-white/20 text-slate-700 text-sm flex items-center gap-1 hover:bg-white/70" aria-label={`View ${p.name}`}>
                      <Eye className="w-4 h-4" /> View
                    </button>
                    <button onClick={() => openEdit(p)} className="px-3 py-1 rounded-xl backdrop-blur-md bg-white/50 border border-white/20 text-slate-700 text-sm flex items-center gap-1 hover:bg-white/70" aria-label={`Edit ${p.name}`}>
                      <Edit2 className="w-4 h-4" /> Edit
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => receive(p.id)} className="px-3 py-1 rounded-xl bg-emerald-500/90 text-white text-sm shadow-md flex items-center gap-1 hover:bg-emerald-600" aria-label={`Receive ${p.name}`}>
                      <Box className="w-4 h-4" /> Receive
                    </button>
                    <button onClick={() => sell(p.id)} className="px-3 py-1 rounded-xl bg-amber-500/90 text-white text-sm shadow-md hover:bg-amber-600" aria-label={`Sell ${p.name}`}>
                      Sell
                    </button>
                    <button onClick={() => remove(p)} className="p-2 rounded-full bg-rose-500 text-white shadow-md hover:bg-rose-600" aria-label={`Delete ${p.name}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {showForm && <ProductForm initial={editing ?? undefined} onClose={() => { setShowForm(false); setEditing(null); fetchProducts(); }} onSaved={fetchProducts} />}
      {showReceiveModalFor && <ReceiveForm productId={showReceiveModalFor.productId} companyId={showReceiveModalFor.companyId} onClose={() => setShowReceiveModalFor(null)} onReceived={fetchProducts} />}
      {showSellModalFor && <SellWithBarcode companyId={showSellModalFor.companyId} onClose={() => setShowSellModalFor(null)} onSold={fetchProducts} />}
    </div>
  );
}
