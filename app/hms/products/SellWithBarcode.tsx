"use client";

import React, { useEffect, useRef, useState } from "react";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";

/**
 * Simple barcode sell modal:
 * - Accepts barcode string (typed or scanned)
 * - Looks up batch by barcode, or product by barcode
 * - Shows available qty & prompts qty to sell
 * - Issues using FIFO if not specific batch
 */

type Props = { companyId: string; onClose: ()=>void; onSold?: ()=>void; };

export default function SellWithBarcode({ companyId, onClose, onSold }: Props) {
  const toast = useToast();
  const [barcode, setBarcode] = useState("");
  const [found, setFound] = useState<any | null>(null);
  const [qty, setQty] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  async function lookup() {
    if (!barcode) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/hms/products/barcode/lookup?company_id=${encodeURIComponent(companyId)}&barcode=${encodeURIComponent(barcode)}`);
      setFound(res.data);
      if (res.data?.type === "batch") {
        // show batch qty
      } else if (res.data?.type === "product") {
        // show aggregated stock
        const stock = await apiClient.get(`/hms/products/${encodeURIComponent(res.data.product.id)}/stock?company_id=${encodeURIComponent(companyId)}`);
        setFound({ ...res.data, stock: stock.data });
      }
    } catch (err: any) {
      console.error("barcode lookup", err);
      toast.error("Not found");
      setFound(null);
    } finally { setLoading(false); }
  }

  async function handleIssue() {
    if (!found) return;
    const productId = found.type === "batch" ? found.batch.product_id : found.product.id;
    const payload: any = { company_id: companyId, qty: Number(qty) };
    // if batch was found and you want to consume from that batch:
    if (found.type === "batch") payload.consumeStrategy = "batch_select", payload.selected_batch_id = found.batch.id;
    try {
      setLoading(true);
      const res = await apiClient.post(`/hms/products/${encodeURIComponent(productId)}/issue`, payload);
      if (res.data?.consumed) {
        toast.success("Issued");
        onSold?.();
        onClose();
      } else {
        toast.success("Issued");
        onSold?.();
        onClose();
      }
    } catch (err: any) {
      console.error("issue err", err);
      toast.error(err?.response?.data?.error ?? err?.message ?? "Issue failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => !loading && onClose()} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-2">Scan / Enter Barcode</h3>
        <div className="grid gap-3">
          <input placeholder="Barcode" value={barcode} onChange={(e)=>setBarcode(e.target.value)} className="px-3 py-2 rounded-xl border" />
          <div className="flex gap-2">
            <button onClick={lookup} className="px-3 py-2 rounded-xl bg-blue-600 text-white">Lookup</button>
            <button onClick={()=>{ setBarcode(''); setFound(null); }} className="px-3 py-2 rounded-xl border">Clear</button>
          </div>

          {found && (
            <div className="p-3 rounded-xl bg-slate-50">
              {found.type === "batch" ? (
                <>
                  <div className="font-semibold">Batch: {found.batch.batch_no}</div>
                  <div className="text-sm">Expiry: {found.batch.expiry_date ?? "—"}</div>
                  <div className="text-sm">MRP: {found.batch.mrp ?? "—"}</div>
                  <div className="text-sm">Available: {found.batch.qty ?? "—"}</div>
                </>
              ) : (
                <>
                  <div className="font-semibold">Product: {found.product.name}</div>
                  <div className="text-sm">SKU: {found.product.sku}</div>
                  <div className="text-sm">Available: {found.stock?.qty ?? "—"}</div>
                </>
              )}
            </div>
          )}

          <input placeholder="Qty to issue" value={String(qty)} onChange={(e)=>setQty(e.target.value === "" ? "" : Number(e.target.value))} className="px-3 py-2 rounded-xl border" />
          <div className="flex justify-end gap-2">
            <button onClick={() => !loading && onClose()} className="px-3 py-2 rounded-xl border">Cancel</button>
            <button onClick={handleIssue} disabled={loading} className="px-3 py-2 rounded-xl bg-amber-600 text-white">{loading ? "Issuing..." : "Issue"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
