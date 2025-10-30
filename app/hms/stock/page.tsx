"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import { useCompany } from "@/app/providers/CompanyProvider";
import ProductModal from "./ProductModal";

/**
 * Stock Ledger page (updated)
 * - Click product name or SKU to open ProductModal (drill-in)
 * - Summary and ledger modes remain; modal integrates Receive/Sell.
 */

type LedgerRow = {
  id: string;
  product_id: string;
  sku?: string;
  product_name?: string;
  batch_id?: string;
  batch_no?: string;
  expiry_date?: string;
  location?: string;
  change_qty: number;
  balance_qty: number;
  movement_type?: string;
  reference?: string;
  cost?: number;
  created_at?: string;
  created_by?: string;
};

type SummaryRow = { product_id: string; sku?: string; name?: string; qty: number; };

export default function StockPage() {
  const toast = useToast();
  const { company } = useCompany();
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"ledger" | "summary">("ledger");
  const [filters, setFilters] = useState({ product_id: "", batch_id: "", movement_type: "", q: "", from: "", to: "" });
  const [limit, setLimit] = useState(200);
  const [offset, setOffset] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // modal
  const [openProductId, setOpenProductId] = useState<string | null>(null);

  useEffect(() => { if (company) fetch(); else { setRows([]); setSummary([]); } return () => abortRef.current?.abort(); /* eslint-disable-next-line */ }, [company, mode]);

  async function fetch(signal?: AbortSignal) {
    if (!company) return;
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const params = new URLSearchParams();
      params.append("company_id", company.id);
      if (filters.product_id) params.append("product_id", filters.product_id);
      if (filters.batch_id) params.append("batch_id", filters.batch_id);
      if (filters.movement_type) params.append("movement_type", filters.movement_type);
      if (filters.q) params.append("q", filters.q);
      if (filters.from) params.append("from", filters.from);
      if (filters.to) params.append("to", filters.to);
      params.append("limit", String(limit));
      params.append("offset", String(offset));

      if (mode === "ledger") {
        const res = await apiClient.get(`/hms/stock?${params.toString()}`, { signal: signal ?? abortRef.current.signal });
        setRows(res.data?.data ?? []);
      } else {
        const res = await apiClient.get(`/hms/stock/summary?company_id=${encodeURIComponent(company.id)}&q=${encodeURIComponent(filters.q || "")}&limit=${limit}&offset=${offset}`, { signal: signal ?? abortRef.current.signal });
        setSummary(res.data?.data ?? []);
      }
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.message === "canceled") return;
      console.error("stock.fetch", err);
      toast.error(err?.message ?? "Failed to load stock");
    } finally { setLoading(false); }
  }

  function applyFilters() { setOffset(0); fetch(); }

  function openProduct(productId: string) {
    setOpenProductId(productId);
  }

  async function exportCsv() {
    if (!company) return toast.error("Select a company");
    try {
      const params = new URLSearchParams();
      params.append("company_id", company.id);
      if (filters.product_id) params.append("product_id", filters.product_id);
      if (filters.batch_id) params.append("batch_id", filters.batch_id);
      if (filters.movement_type) params.append("movement_type", filters.movement_type);
      if (filters.q) params.append("q", filters.q);
      if (filters.from) params.append("from", filters.from);
      if (filters.to) params.append("to", filters.to);
      params.append("limit", "10000");
      const url = `/hms/stock/export?${params.toString()}`;

      const resp = await apiClient.get(url, { responseType: "blob" });
      const blob = new Blob([resp.data], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const href = URL.createObjectURL(blob);
      link.href = href;
      link.download = `stock_ledger_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
      toast.success("Export started");
    } catch (err: any) {
      console.error("export csv", err);
      toast.error("Export failed");
    }
  }

  return (
    <div className="min-h-screen p-8">
      <motion.header initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Ledger</h1>
          <p className="text-sm text-slate-500">Inventory movements & balances</p>
        </div>

        <div className="flex gap-3">
          <div className="inline-flex gap-2 items-center">
            <button onClick={() => { setMode("ledger"); fetch(); }} className={`px-3 py-2 rounded-xl ${mode === "ledger" ? "bg-blue-600 text-white" : "border"}`}>Ledger</button>
            <button onClick={() => { setMode("summary"); fetch(); }} className={`px-3 py-2 rounded-xl ${mode === "summary" ? "bg-blue-600 text-white" : "border"}`}>Summary</button>
          </div>
          <button onClick={exportCsv} className="px-3 py-2 rounded-xl border">Export CSV</button>
          <button onClick={() => fetch()} className="px-3 py-2 rounded-xl border">Refresh</button>
        </div>
      </motion.header>

      <div className="max-w-6xl mx-auto space-y-4">
        <div className="p-3 rounded-2xl bg-white/80 backdrop-blur-md flex gap-2 flex-wrap items-center">
          <input placeholder="Product ID or SKU" value={filters.product_id} onChange={(e)=>setFilters(s=>({...s, product_id:e.target.value}))} className="px-2 py-2 rounded-xl border" />
          <input placeholder="Batch ID / Batch No" value={filters.batch_id} onChange={(e)=>setFilters(s=>({...s, batch_id:e.target.value}))} className="px-2 py-2 rounded-xl border" />
          <select value={filters.movement_type} onChange={(e)=>setFilters(s=>({...s, movement_type:e.target.value}))} className="px-2 py-2 rounded-xl border">
            <option value="">All types</option>
            <option value="purchase">purchase</option>
            <option value="opening">opening</option>
            <option value="issue">issue</option>
            <option value="adjust">adjust</option>
            <option value="transfer">transfer</option>
          </select>
          <input placeholder="Search sku/name/batch/ref" value={filters.q} onChange={(e)=>setFilters(s=>({...s, q:e.target.value}))} className="px-2 py-2 rounded-xl border flex-1" />
          <input type="date" value={filters.from} onChange={(e)=>setFilters(s=>({...s, from:e.target.value}))} className="px-2 py-2 rounded-xl border" />
          <input type="date" value={filters.to} onChange={(e)=>setFilters(s=>({...s, to:e.target.value}))} className="px-2 py-2 rounded-xl border" />
          <button onClick={applyFilters} className="px-3 py-2 rounded-xl bg-blue-600 text-white">Apply</button>
        </div>

        {mode === "summary" && (
          <div className="p-4 rounded-2xl bg-white border">
            <h3 className="text-sm font-medium mb-3">Stock Summary (per product)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {loading && <div>Loading...</div>}
              {!loading && summary.length === 0 && <div className="text-slate-500">No data</div>}
              {summary.map(s => (
                <div key={s.product_id} className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      <button onClick={() => openProduct(s.product_id)} className="underline hover:text-blue-600">{s.name ?? s.sku ?? s.product_id}</button>
                    </div>
                    <div className="text-xs text-slate-500">{s.sku}</div>
                  </div>
                  <div className="text-sm">{Number(s.qty).toFixed(3)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "ledger" && (
          <div className="p-4 rounded-2xl bg-white border">
            <h3 className="text-sm font-medium mb-3">Ledger</h3>
            <div className="space-y-2">
              {loading && <div>Loading...</div>}
              {!loading && rows.length === 0 && <div className="text-slate-500">No ledger rows</div>}
              {rows.map(r => (
                <div key={r.id} className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">
                      <button onClick={() => openProduct(r.product_id)} className="underline hover:text-blue-600">{r.product_name ?? r.sku ?? r.product_id}</button>
                    </div>
                    <div className="text-xs text-slate-500">{r.sku ? `${r.sku} • ` : ""}{r.batch_no ? `Batch: ${r.batch_no} • ` : ""}{r.reference ?? ""}</div>
                    <div className="text-xs text-slate-400">{new Date(r.created_at ?? "").toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${Number(r.change_qty) < 0 ? "text-rose-600" : "text-emerald-600"}`}>{Number(r.change_qty).toFixed(3)}</div>
                    <div className="text-xs text-slate-500">Bal: {Number(r.balance_qty).toFixed(3)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-slate-500">Showing {rows.length} rows</div>
              <div className="flex gap-2">
                <button onClick={() => { setOffset(Math.max(0, offset - limit)); fetch(); }} className="px-3 py-2 rounded-xl border">Prev</button>
                <button onClick={() => { setOffset(offset + limit); fetch(); }} className="px-3 py-2 rounded-xl border">Next</button>
              </div>
            </div>
          </div>
        )}

      </div>

      {openProductId && (
        <ProductModal
          productId={openProductId}
          onClose={() => setOpenProductId(null)}
        />
      )}
    </div>
  );
}
