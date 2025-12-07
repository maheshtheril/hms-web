// app/hms/products/Page.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import ProductForm from "./ProductEditor";
import ReceiveForm from "./ReceiveForm";
import SellWithBarcode from "./SellWithBarcode";
import ConfirmModal from "@/components/ConfirmModal";
import { useRouter } from "next/navigation";
import CompanySelector from "@/components/CompanySelector";
import { useCompany } from "@/app/providers/CompanyProvider";
import { Search, Plus, RefreshCw, Edit2, Eye, Trash2, Box, DollarSign } from "lucide-react";

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

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  // confirm modal state
  const [confirming, setConfirming] = useState<{ product: Product } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  /* ---------------- helpers ---------------- */
  const formatCurrency = (val?: number, cur = "INR") => {
    if (val == null) return "—";
    try {
      return new Intl.NumberFormat("en-IN", { style: "currency", currency: cur }).format(val);
    } catch {
      return `${Number(val).toFixed(2)} ${cur}`;
    }
  };

  /* ---------------- fetch products (debounced + abort) ---------------- */
  const fetchProducts = useCallback(
    async (opts: { force?: boolean } = {}) => {
      try {
        if (!company) {
          setProducts([]);
          toast.info("Please select a company to load products.");
          return;
        }

        // debounce unless forced
        if (!opts.force) {
          if (debounceRef.current) window.clearTimeout(debounceRef.current);
          debounceRef.current = window.setTimeout(() => fetchProducts({ force: true }), 300);
          return;
        }

        setLoading(true);
        // abort previous
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        const signal = abortRef.current.signal;

        const params = new URLSearchParams();
        if (query) params.append("q", query);
        params.append("company_id", company.id);

        const res = await apiClient.get(`/hms/products?${params.toString()}`, { signal });
        const rows = (res?.data?.data ?? []) as Product[];
        setProducts(rows);
      } catch (err: any) {
        // ignore aborts
        if (err?.name === "CanceledError" || err?.name === "AbortError" || err?.message === "canceled") return;
        console.error("fetchProducts", err);
        toast.error(err?.message ?? "Failed to load products", "Load failed");
      } finally {
        setLoading(false);
      }
    },
    [company, query, toast]
  );

  useEffect(() => {
    fetchProducts();
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [fetchProducts]);

  /* ---------------- actions ---------------- */
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

  /* open confirm modal for delete */
  const onDeleteConfirm = (p: Product) => {
    setConfirming({ product: p });
  };

  /* actual delete handler triggered by modal confirm (optimistic + rollback) */
  const handleDelete = async () => {
    if (!confirming || !company) {
      setConfirming(null);
      return;
    }
    const p = confirming.product;

    setConfirmLoading(true);
    setDeleting((s) => ({ ...s, [p.id]: true }));

    const prev = products;
    try {
      // optimistic UI update
      setProducts((cur) => cur.filter((x) => x.id !== p.id));

      // call API
      await apiClient.delete(`/hms/products/${encodeURIComponent(p.id)}`, { data: { company_id: company!.id } });

      // success UI
      setConfirming(null);
      toast.success("Deleted", "Success");
    } catch (err: any) {
      // rollback on error
      setProducts(prev);
      console.error("delete product", err);
      toast.error(err?.message ?? "Delete failed");
    } finally {
      setConfirmLoading(false);
      setDeleting((s) => {
        const next = { ...s };
        delete next[p.id];
        return next;
      });
    }
  };

  return (
    <div className="relative min-h-screen p-6 lg:p-10 bg-gradient-to-br from-slate-100/70 via-white/60 to-slate-50/70 backdrop-blur-2xl overflow-hidden">
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
          {/* Always visible selector — mobile & desktop */}
          <div className="bg-white rounded-xl p-2 shadow-sm border z-40">
            <CompanySelector />
          </div>
        </div>

        <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-3 flex-1 md:flex-none backdrop-blur-md bg-white/30 border border-white/20 rounded-3xl px-4 py-2 shadow-inner">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              placeholder="Search name or SKU"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchProducts({ force: true })}
              className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400"
            />
            <button onClick={() => fetchProducts({ force: true })} className="rounded-xl px-3 py-1 text-sm bg-blue-600/80 hover:bg-blue-600 text-white shadow-md transition-all">
              Go
            </button>
          </div>

          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl hover:scale-[1.02] transition-transform">
            <Plus className="w-4 h-4" /> New Product
          </button>
          <button onClick={() => fetchProducts({ force: true })} className="p-2 rounded-2xl border border-white/30 bg-white/40 shadow-inner hover:bg-white/60" aria-label="Refresh">
            <RefreshCw className="w-4 h-4 text-slate-700" />
          </button>
          <button onClick={() => sell(undefined)} className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:scale-[1.02]">
            <DollarSign className="w-4 h-4 inline-block mr-1" /> Sell (Scan)
          </button>
        </div>
      </motion.header>

      <main className="relative z-10 max-w-7xl mx-auto space-y-8" aria-busy={loading}>
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
                  <div className="text-right text-slate-700 font-semibold">{formatCurrency(p.price, p.currency ?? "INR")}</div>
                </div>
                <p className="mt-2 text-sm text-slate-700 line-clamp-3 flex-1">{p.description ?? "No description provided."}</p>

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
                    <button
                      disabled={!!deleting[p.id]}
                      onClick={() => onDeleteConfirm(p)}
                      className={`p-2 rounded-full ${deleting[p.id] ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-rose-500 text-white"} shadow-md`}
                      aria-label={`Delete ${p.name}`}
                      title={deleting[p.id] ? "Deleting…" : `Delete ${p.name}`}
                    >
                      {deleting[p.id] ? <span className="w-4 h-4 inline-block">…</span> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <ConfirmModal
        open={!!confirming}
        title="Delete product"
        description={confirming ? `Delete ${confirming.product.name} (${confirming.product.sku ?? "no SKU"})? This action cannot be undone.` : "Delete product?"}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={confirmLoading}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(null)}
      />

      {showForm && (
        <ProductForm
          productId={editing?.id ?? undefined}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
            fetchProducts({ force: true });
          }}
          onSaved={() => fetchProducts({ force: true })}
        />
      )}
      {showReceiveModalFor && <ReceiveForm productId={showReceiveModalFor.productId} companyId={showReceiveModalFor.companyId} onClose={() => setShowReceiveModalFor(null)} onReceived={() => fetchProducts({ force: true })} />}
      {showSellModalFor && <SellWithBarcode companyId={showSellModalFor.companyId} onClose={() => setShowSellModalFor(null)} onSold={() => fetchProducts({ force: true })} />}
    </div>
  );
}
