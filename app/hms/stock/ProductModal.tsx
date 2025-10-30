"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import ReceiveForm from "@/app/hms/products/ReceiveForm";
import SellWithBarcode from "@/app/hms/products/SellWithBarcode";
import { useCompany } from "@/app/providers/CompanyProvider";

type Props = {
  productId: string;
  onClose: () => void;
  open?: boolean;
  // optional title override
  title?: string;
};

export default function ProductModal({ productId, onClose, open = true, title }: Props) {
  const toast = useToast();
  const { company } = useCompany();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any | null>(null);
  const [stock, setStock] = useState<any | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [showReceive, setShowReceive] = useState(false);
  const [showSell, setShowSell] = useState(false);

  useEffect(() => { if (open) fetch(); /* eslint-disable-next-line */ }, [open, productId, company]);

  async function fetch() {
    if (!company) return;
    setLoading(true);
    try {
      // product details (you may have an endpoint; fallback to product detail route)
      const p = await apiClient.get(`/hms/products/${encodeURIComponent(productId)}?company_id=${encodeURIComponent(company.id)}`).catch(()=>null);
      if (p?.data) setProduct(p.data);
      // stock (batch breakdown)
      const s = await apiClient.get(`/hms/products/${encodeURIComponent(productId)}/stock?company_id=${encodeURIComponent(company.id)}`).catch(()=>null);
      if (s?.data) setStock(s.data);
      // ledger (recent)
      const l = await apiClient.get(`/hms/stock?company_id=${encodeURIComponent(company.id)}&product_id=${encodeURIComponent(productId)}&limit=50`).catch(()=>null);
      if (l?.data?.data) setLedger(l.data.data);
    } catch (err: any) {
      console.error("product modal fetch", err);
      toast.error("Failed to load product details");
    } finally { setLoading(false); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => onClose()} />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-3xl bg-white rounded-2xl p-6 shadow-2xl overflow-auto max-h-[85vh]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">{title ?? (product?.name ?? `Product ${productId}`)}</h3>
            <div className="text-xs text-slate-500">{product?.sku ?? ""}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowReceive(true)} className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-sm">Receive</button>
            <button onClick={() => setShowSell(true)} className="px-3 py-1 rounded-xl bg-amber-600 text-white text-sm">Sell</button>
            <button onClick={() => onClose()} className="px-3 py-1 rounded-xl border text-sm">Close</button>
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500">Description</div>
              <div className="text-sm">{product?.description ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Stock (aggregate)</div>
              <div className="text-sm">{stock?.qty ?? "—"}</div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Batches</div>
              <div className="text-xs text-slate-400">Expiry / MRP / Qty</div>
            </div>
            <div className="space-y-2">
              {loading && <div className="text-sm text-slate-500">Loading batches...</div>}
              {!loading && (!stock?.batches || stock.batches.length === 0) && <div className="text-slate-500">No batches</div>}
              {stock?.batches?.map((b: any) => (
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
              <div className="text-sm font-medium">Recent Movements</div>
              <div className="text-xs text-slate-400">Latest 50</div>
            </div>
            <div className="space-y-2">
              {loading && <div className="text-sm text-slate-500">Loading ledger...</div>}
              {!loading && ledger.length === 0 && <div className="text-slate-500">No movements</div>}
              {ledger.map((r: any) => (
                <div key={r.id} className="p-3 rounded-xl bg-white border flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{r.product_name ?? r.sku ?? r.product_id}</div>
                    <div className="text-xs text-slate-500">{r.batch_no ? `Batch: ${r.batch_no} • ` : ""}{r.reference ?? ""}</div>
                    <div className="text-xs text-slate-400">{new Date(r.created_at ?? "").toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${Number(r.change_qty) < 0 ? "text-rose-600" : "text-emerald-600"}`}>{Number(r.change_qty).toFixed(3)}</div>
                    <div className="text-xs text-slate-500">Bal: {Number(r.balance_qty).toFixed(3)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </motion.div>

      {showReceive && company && (
        <ReceiveForm
          productId={productId}
          companyId={company.id}
          onClose={() => { setShowReceive(false); fetch(); }}
          onReceived={() => { fetch(); toast.success("Received"); }}
        />
      )}

      {showSell && company && (
        <SellWithBarcode
          companyId={company.id}
          onClose={() => { setShowSell(false); fetch(); }}
          onSold={() => { fetch(); toast.success("Issued"); }}
        />
      )}
    </div>
  );
}
