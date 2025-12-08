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
import { Search, Plus, RefreshCw, Edit2, Eye, Trash2, Box, DollarSign, Layers } from "lucide-react";

type Batch = {
  batch_id: string;
  batch_no: string;
  expiry_date?: string | null;
  qty: number;
  mrp?: number | null;
  cost?: number | null;
};

type Product = {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string;
  price?: number | null;
  currency?: string | null;
  default_cost?: number | null;
  uom?: string | null;
  is_stockable?: boolean;
  is_service?: boolean;
  stock_qty?: number | null; // total available
  low_stock?: boolean; // server-calculated flag
  nearest_expiry_days?: number | null;
  metadata?: Record<string, any> | null;
};

export default function Page(): JSX.Element {
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

  const [batchModalFor, setBatchModalFor] = useState<{ productId: string; name: string } | null>(null);
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [batchesLoading, setBatchesLoading] = useState(false);

  // Use ReturnType<typeof setTimeout> to avoid NodeJS/browser conflicts
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  // confirm modal state
  const [confirming, setConfirming] = useState<{ product: Product } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  /* ---------------- helpers ---------------- */
  const formatCurrency = (val?: number | null, cur = "INR") => {
    if (val == null) return "—";
    try {
      return new Intl.NumberFormat("en-IN", { style: "currency", currency: cur }).format(val);
    } catch {
      return `${Number(val).toFixed(2)} ${cur}`;
    }
  };

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
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => fetchProducts({ force: true }), 300);
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
        params.append("include_stock", "true");

        // NOTE: ensure apiClient is an axios-like instance that accepts `signal`
        const res = await apiClient.get(`/hms/products?${params.toString()}`, { signal });
        const rows = (res?.data?.data ?? []) as Product[];
        setProducts(rows);
      } catch (err: any) {
        // axios / fetch cancellation handling — ignore canceled requests
        const name = err?.name ?? err?.code ?? null;
        if (name === "CanceledError" || name === "AbortError" || err?.message === "canceled") {
          return;
        }
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
      if (debounceRef.current) clearTimeout(debounceRef.current);
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

      // call API (soft delete recommended)
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

  /* fetch batch-level stock when opening modal */
  const openBatchModal = async (productId: string, name: string) => {
    setBatchModalFor({ productId, name });
    setBatches(null);
    setBatchesLoading(true);
    try {
      const res = await apiClient.get(`/hms/products/${encodeURIComponent(productId)}/stock`, { params: { company_id: company?.id } });
      setBatches(res?.data?.data ?? []);
    } catch (err: any) {
      console.error("fetch batches", err);
      toast.error("Failed to load batch stock");
    } finally {
      setBatchesLoading(false);
    }
  };

  /* pill helper for stock */
  const StockPill: React.FC<{ qty?: number | null; low?: boolean; expiryDays?: number | null }> = ({ qty, low, expiryDays }) => {
    const qtyText = qty == null ? "—" : `${Number(qty).toLocaleString()}`;
    const base = "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium shadow-sm";
    if (low) return <span className={`${base} bg-rose-50 text-rose-700 border border-rose-100`}>Low: {qtyText}</span>;
    if ((expiryDays ?? 999) <= 30) return <span className={`${base} bg-amber-50 text-amber-800 border border-amber-100`}>Exp: {qtyText}</span>;
    return <span className={`${base} bg-emerald-50 text-emerald-800 border border-emerald-100`}>In stock: {qtyText}</span>;
  };

  return (
    <div className="relative min-h-screen p-6 lg:p-10 bg-gradient-to-br from-slate-100/50 via-white/40 to-sky-50/40 backdrop-blur-2xl overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] w-[520px] h-[520px] rounded-full bg-blue-400/10 blur-3xl" />
        <div className="absolute bottom-[-8%] left-[-12%] w-[420px] h-[420px] rounded-full bg-violet-300/8 blur-3xl" />
      </div>

      <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-7xl mx-auto mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="backdrop-blur-xl bg-white/10 border border-white/10 rounded-3xl p-5 shadow-xl">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 drop-shadow-sm">Products</h1>
            <p className="text-sm text-slate-600 mt-1">Your catalog — stock, SKU, and smart batch management</p>
          </div>
          <div className="bg-white/6 rounded-xl p-2 shadow-sm border border-white/6 z-40">
            <CompanySelector />
          </div>
        </div>

        <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-3 flex-1 md:flex-none backdrop-blur-md bg-white/6 border border-white/6 rounded-3xl px-4 py-2 shadow-inner">
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
          <button onClick={() => fetchProducts({ force: true })} className="p-2 rounded-2xl border border-white/10 bg-white/4 shadow-inner hover:bg-white/6" aria-label="Refresh">
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
              <div key={i} className="h-48 rounded-3xl bg-gradient-to-br from-white/6 to-white/4 border border-white/6 shadow-inner" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center p-10 backdrop-blur-md bg-white/6 border border-white/8 rounded-3xl shadow-xl text-slate-600">
            {company ? "No products found. Add a new one to get started." : "Please select a company to load products."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((p) => (
              <motion.div key={p.id} whileHover={{ scale: 1.02 }} className="relative p-5 rounded-3xl backdrop-blur-xl bg-gradient-to-br from-white/6 to-sky-50/6 border border-white/8 shadow-lg hover:shadow-2xl transition-all flex flex-col">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 drop-shadow-sm">{p.name}</h2>
                    <p className="text-xs text-slate-500">{p.sku}</p>
                  </div>
                  <div className="text-right text-slate-700 font-semibold">{formatCurrency(p.price ?? null, p.currency ?? "INR")}</div>
                </div>
                <p className="mt-2 text-sm text-slate-700 line-clamp-3 flex-1">{p.description ?? "No description provided."}</p>

                <div className="mt-4 flex justify-between items-center">
                  <div className="flex gap-2 items-center">
                    <StockPill qty={p.stock_qty ?? null} low={!!p.low_stock} expiryDays={p.nearest_expiry_days ?? null} />
                    <button onClick={() => openBatchModal(p.id, p.name)} className="inline-flex items-center gap-2 px-2 py-1 text-xs rounded-md border border-white/8 bg-white/4 hover:bg-white/6">
                      <Layers className="w-4 h-4" /> Stock
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => view(p.id)} className="px-3 py-1 rounded-xl backdrop-blur-md bg-white/6 border border-white/8 text-slate-700 text-sm flex items-center gap-1 hover:bg-white/8" aria-label={`View ${p.name}`}>
                      <Eye className="w-4 h-4" /> View
                    </button>
                    <button onClick={() => openEdit(p)} className="px-3 py-1 rounded-xl backdrop-blur-md bg-white/6 border border-white/8 text-slate-700 text-sm flex items-center gap-1 hover:bg-white/8" aria-label={`Edit ${p.name}`}>
                      <Edit2 className="w-4 h-4" /> Edit
                    </button>
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
          // NOTE: ProductForm must accept `productId?: string` and callbacks below
          productId={editing?.id ?? undefined}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
            fetchProducts({ force: true });
          }}
          onSaved={() => fetchProducts({ force: true })}
        />
      )}
      {showReceiveModalFor && (
        <ReceiveForm
          productId={showReceiveModalFor.productId}
          companyId={showReceiveModalFor.companyId}
          onClose={() => setShowReceiveModalFor(null)}
          onReceived={() => fetchProducts({ force: true })}
        />
      )}
      {showSellModalFor && (
        <SellWithBarcode
          companyId={showSellModalFor.companyId}
          onClose={() => setShowSellModalFor(null)}
          onSold={() => fetchProducts({ force: true })}
        />
      )}

      {/* Batch modal */}
      {batchModalFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/30" onClick={() => setBatchModalFor(null)} />
          <div className="relative z-10 w-full max-w-3xl rounded-2xl p-6 bg-white/6 border border-white/8 backdrop-blur-xl shadow-xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Batch stock — {batchModalFor.name}</h3>
                <p className="text-sm text-slate-500">Batch-wise quantities and expiry</p>
              </div>
              <div>
                <button className="px-3 py-1 rounded-md bg-white/4 border border-white/8" onClick={() => setBatchModalFor(null)}>Close</button>
              </div>
            </div>

            {batchesLoading ? (
              <div className="text-center py-8">Loading…</div>
            ) : !batches || batches.length === 0 ? (
              <div className="text-center py-8">No batch information available.</div>
            ) : (
              <div className="grid gap-3">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate-600">
                        <th className="py-2 pr-4">Batch</th>
                        <th className="py-2 pr-4">Expiry</th>
                        <th className="py-2 pr-4">Qty</th>
                        <th className="py-2 pr-4">MRP</th>
                        <th className="py-2 pr-4">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((b) => (
                        <tr key={b.batch_id} className="border-t border-white/6">
                          <td className="py-3 pr-4">{b.batch_no}</td>
                          <td className="py-3 pr-4">{b.expiry_date ?? "—"}</td>
                          <td className="py-3 pr-4">{Number(b.qty).toLocaleString()}</td>
                          <td className="py-3 pr-4">{b.mrp ? formatCurrency(b.mrp) : "—"}</td>
                          <td className="py-3 pr-4">{b.cost ? formatCurrency(b.cost) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
