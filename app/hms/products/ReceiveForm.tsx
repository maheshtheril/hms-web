"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";

type Props = { productId: string; companyId: string; onClose: ()=>void; onReceived?: ()=>void; };

export default function ReceiveForm({ productId, companyId, onClose, onReceived }: Props) {
  const toast = useToast();
  const [batchNo, setBatchNo] = useState("");
  const [expiry, setExpiry] = useState("");
  const [mrp, setMrp] = useState("");
  const [cost, setCost] = useState("");
  const [qty, setQty] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!companyId || !productId) return;
    if (!qty || Number(qty) <= 0) { toast.error("Quantity required"); return; }

    setLoading(true);
    try {
      const res = await apiClient.post("/hms/products/receive", {
        company_id: companyId,
        product_id: productId,
        batch_no: batchNo || undefined,
        expiry_date: expiry || undefined,
        mrp: mrp ? Number(mrp) : undefined,
        cost: cost ? Number(cost) : undefined,
        qty: Number(qty),
        reference: `GRN-${Date.now().toString(36)}`,
      });
      toast.success("Received");
      onReceived?.();
      onClose();
    } catch (err: any) {
      console.error("receive err", err);
      toast.error(err?.response?.data?.error ?? err?.message ?? "Receive failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => !loading && onClose()} />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md bg-white rounded-2xl p-6">
        <h3 className="text-lg font-semibold">Receive Goods</h3>
        <form onSubmit={handleSubmit} className="grid gap-3 mt-3">
          <input placeholder="Batch No (optional)" value={batchNo} onChange={(e)=>setBatchNo(e.target.value)} className="px-3 py-2 rounded-xl border" />
          <input type="date" value={expiry} onChange={(e)=>setExpiry(e.target.value)} className="px-3 py-2 rounded-xl border" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="MRP" value={mrp} onChange={(e)=>setMrp(e.target.value)} className="px-3 py-2 rounded-xl border" />
            <input placeholder="Cost" value={cost} onChange={(e)=>setCost(e.target.value)} className="px-3 py-2 rounded-xl border" />
          </div>
          <input placeholder="Quantity (base units)" value={String(qty)} onChange={(e)=>setQty(e.target.value === "" ? "" : Number(e.target.value))} className="px-3 py-2 rounded-xl border" />
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={()=>!loading && onClose()} className="px-4 py-2 rounded-xl border">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-blue-600 text-white">{loading ? "Receiving..." : "Receive"}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
