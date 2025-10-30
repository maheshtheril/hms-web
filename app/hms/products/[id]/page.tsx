"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { motion } from "framer-motion";
import ReceiveForm from "../ReceiveForm";
import SellWithBarcode from "../SellWithBarcode";
import { useToast } from "@/components/toast/ToastProvider";

export default function ProductDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [p, setP] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string>((window as any).__DEFAULT_COMPANY_ID || "");
  const [showReceive, setShowReceive] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [ledger, setLedger] = useState<any[]>([]);

  useEffect(() => { fetch(); /* eslint-disable-next-line */ }, []);

  async function fetch() {
    setLoading(true);
    try {
      if (!companyId) {
        setErr("company_id not set (set window.__DEFAULT_COMPANY_ID)");
        setLoading(false);
        return;
      }
      const res = await apiClient.get(`/hms/products/${encodeURIComponent(params.id)}?company_id=${encodeURIComponent(companyId)}`);
      setP(res.data);
      // fetch stock and batch breakdown
      const sres = await apiClient.get(`/hms/products/${encodeURIComponent(params.id)}/stock?company_id=${encodeURIComponent(companyId)}`);
      // also ledger
      const lres = await apiClient.get(`/hms/products/${encodeURIComponent(params.id)}/ledger?company_id=${encodeURIComponent(companyId)}&limit=50`);
      setLedger(lres.data?.data ?? []);
      // attach stock info to product object for UI
      setP(prev => ({ ...prev, stock: sres.data }));
    } catch (e: any) {
      console.error(e);
      setErr("Failed to load product");
    } finally { setLoading(false); }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (err) return <div className="p-6 text-rose-600">{err}</div>;
  if (!p) return <div className="p-6">Not found</div>;

  return (
    <div className="min-h-screen p-8">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{p.name}</h1>
            <div className="text-sm text-slate-500">{p.sku}</div>
          </div>
          <div className="text-sm text-slate-600">{p.price ? `${Number(p.price).toFixed(2)} ${p.currency}` : "—"}</div>
        </div>

        <div className="mt-4 grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500">Description</div>
              <div className="text-sm">{p.description ?? "—"}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Stock (aggregate)</div>
              <div className="text-sm">{p.stock?.qty ?? "—"}</div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Batches</div>
              <div className="text-xs text-slate-400">Expiry / MRP / Qty</div>
            </div>
            <div className="mt-2 space-y-2">
              {(p.stock?.batches ?? []).length === 0 && <div className="text-slate-500">No batches</div>}
              {(p.stock?.batches ?? []).map((b: any) => (
                <div key={b.id} className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{b.batch_no}</div>
                    <div className="text-xs text-slate-500">Expiry: {b.expiry_date ?? "—"} • MRP: {b.mrp ?? "—"}</div>
                  </div>
                  <div className="text-sm">{Number(b.qty).toFixed(3)}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Recent ledger</div>
              <div className="text-xs text-slate-400">Movements</div>
            </div>
            <div className="space-y-2">
              {ledger.map((row: any) => (
                <div key={row.id} className="p-2 rounded-xl bg-white border flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium">{row.movement_type}</div>
                    <div className="text-xs text-slate-500">{row.reference ?? "—"} • {new Date(row.created_at).toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Batch: {row.batch_id ?? "—"}</div>
                  </div>
                  <div className={`text-sm ${Number(row.change_qty) < 0 ? "text-rose-600" : "text-emerald-600"}`}>{Number(row.change_qty).toFixed(3)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowReceive(true)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white">Receive</button>
            <button onClick={() => setShowSell(true)} className="px-4 py-2 rounded-xl bg-amber-600 text-white">Sell / Issue</button>
            <button onClick={() => router.back()} className="px-4 py-2 rounded-xl border">Back</button>
          </div>
        </div>
      </motion.div>

      {showReceive && (
        <ReceiveForm
          productId={p.id}
          companyId={companyId}
          onClose={() => { setShowReceive(false); fetch(); }}
          onReceived={() => { fetch(); toast.success("Received"); }}
        />
      )}

      {showSell && (
        <SellWithBarcode
          companyId={companyId}
          onClose={() => { setShowSell(false); fetch(); }}
          onSold={() => { fetch(); toast.success("Sold"); }}
        />
      )}
    </div>
  );
}
