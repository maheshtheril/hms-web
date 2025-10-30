"use client";

import React, { useState } from "react";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import { motion } from "framer-motion";

/**
 * PaymentForm props:
 * - invoiceId: string (required)
 * - companyId?: string (optional)
 * - onClose(): void
 * - onSaved?(): void
 */
export default function PaymentForm({
  invoiceId,
  companyId,
  onClose,
  onSaved,
}: {
  invoiceId: string;
  companyId?: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const toast = useToast();
  const [amount, setAmount] = useState<number | "">("");
  const [method, setMethod] = useState<string>("Cash");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [paidAt, setPaidAt] = useState<string>(new Date().toISOString().slice(0, 16));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!invoiceId) return toast.error("Missing invoice id");
    if (!amount || Number(amount) <= 0) return toast.error("Enter a payment amount");

    setSaving(true);
    try {
      const payload: any = {
        invoice_id: invoiceId,
        amount: Number(amount),
        method,
        payment_reference: paymentReference || null,
        paid_at: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
        currency: "INR",
        metadata: {},
      };

      const res = await apiClient.post(`/hms/invoice-payments`, payload);
      toast.success("Payment recorded");
      onSaved && onSaved();
    } catch (err: any) {
      console.error("record payment", err);
      toast.error(err?.message ?? "Payment failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} className="w-[480px] bg-white rounded-2xl shadow-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">Record Payment</div>
            <div className="text-lg font-semibold">{invoiceId}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1 rounded-xl border">Close</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-emerald-600 text-white">
              {saving ? "Recording..." : "Record"}
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-slate-500">Amount</label>
            <input type="number" step="0.01" value={amount as any} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500">Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full px-3 py-2 rounded-xl border">
                <option>Cash</option>
                <option>Card</option>
                <option>UPI</option>
                <option>Bank Transfer</option>
                <option>Insurance</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500">Paid at</label>
              <input type="datetime-local" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500">Reference (optional)</label>
            <input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} className="w-full px-3 py-2 rounded-xl border" placeholder="txn id / external ref" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
