"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import { useRouter } from "next/navigation";
import CompanySelector from "@/components/CompanySelector";
import { useCompany } from "@/app/providers/CompanyProvider";
import { Plus, Search, Trash, Edit, DollarSign } from "lucide-react";

/**
 * Placeholder imports — create these components like your ProductForm/ReceiveForm
 * - InvoiceForm: create/edit invoice (accept initial, company, onSaved, onClose)
 * - PaymentForm: create payment (invoiceId, companyId, onSaved, onClose)
 *
 * Implement them with the same style as ProductForm.
 */
import InvoiceForm from "./InvoiceForm"; // create like ProductForm
import PaymentForm from "./PaymentForm"; // quick payment modal

type Invoice = {
  id: string;
  invoice_number: string;
  patient_id?: string | null;
  issued_at?: string;
  due_at?: string | null;
  subtotal?: number;
  total_tax?: number;
  total_discount?: number;
  total?: number;
  total_paid?: number;
  status?: string;
  locked?: boolean;
  created_at?: string;
  updated_at?: string;
};

export default function InvoicesPage() {
  const toast = useToast();
  const router = useRouter();
  const { company } = useCompany();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);

  const [showInvoiceFormFor, setShowInvoiceFormFor] = useState<{ invoice?: Invoice } | null>(null);
  const [showPaymentFor, setShowPaymentFor] = useState<{ invoiceId: string; companyId: string } | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  async function fetchInvoices() {
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      if (!company) {
        setInvoices([]);
        setLoading(false);
        toast.info("Please select a company to load invoices.");
        return;
      }

      const params = new URLSearchParams();
      params.set("limit", "25");
      params.set("offset", String(page * 25));
      params.set("company_id", company.id); // if your API requires company filter
      if (query) params.set("q", query);
      if (status) params.set("status", status);

      const res = await apiClient.get(`/hms/invoices?${params.toString()}`, { signal: abortRef.current.signal });
      setInvoices(res.data?.data ?? []);
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.message === "canceled") return;
      console.error("fetchInvoices", err);
      toast.error(err?.message ?? "Failed to load invoices", "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInvoices();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, page, status]);

  // quick search debounce-ish: user hits Enter or uses Search button to trigger
  function onSearch() {
    setPage(0);
    fetchInvoices();
  }

  function openCreate() {
    setShowInvoiceFormFor({ invoice: undefined });
  }
  function openEdit(inv: Invoice) {
    if (inv.locked) {
      toast.error("Invoice is locked and cannot be edited");
      return;
    }
    setShowInvoiceFormFor({ invoice: inv });
  }
  function view(inv: Invoice) {
    setViewingInvoice(inv);
  }

  async function remove(inv: Invoice) {
    if (!confirm(`Delete invoice ${inv.invoice_number}?`)) return;
    try {
      // backend expects just invoice id and infers tenant/company from session; adjust if your API needs company_id
      await apiClient.delete(`/hms/invoices/${encodeURIComponent(inv.id)}`);
      toast.success("Deleted", "Success");
      await fetchInvoices();
    } catch (err: any) {
      console.error("delete invoice", err);
      toast.error(err?.message ?? "Delete failed");
    }
  }

  async function openPayment(inv: Invoice) {
    if (inv.locked) {
      toast.error("Invoice locked — cannot accept payments");
      return;
    }
    if (!company) return toast.error("Select a company first");
    setShowPaymentFor({ invoiceId: inv.id, companyId: company.id });
  }

  return (
    <div className="min-h-screen p-8">
      <motion.header initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Billing — Invoices</h1>
            <p className="text-sm text-slate-500">Create, send and record payments for invoices</p>
          </div>

          <div className="ml-4">
            <CompanySelector />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={openCreate} className="px-4 py-2 rounded-xl bg-blue-600 text-white inline-flex items-center gap-2">
            <Plus size={16} /> New Invoice
          </button>
          <button onClick={() => fetchInvoices()} className="px-3 py-2 rounded-xl border">Refresh</button>
        </div>
      </motion.header>

      <div className="max-w-6xl mx-auto space-y-4">
        <div className="p-3 rounded-2xl bg-white/80 backdrop-blur-md flex items-center gap-2">
          <input placeholder="Search invoice # or patient id" value={query} onChange={(e) => setQuery(e.target.value)} className="px-3 py-2 rounded-xl border flex-1" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 rounded-xl border">
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button onClick={onSearch} className="px-3 py-2 rounded-xl bg-slate-800 text-white inline-flex items-center gap-2"><Search size={14}/> Search</button>
        </div>

        <div className="p-4 rounded-2xl bg-white border">
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="text-left text-sm text-gray-500">
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Issued</th>
                  <th className="p-3">Due</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Paid</th>
                  <th className="p-3">Balance</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="p-6 text-center">Loading...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={9} className="p-6 text-center text-slate-500">{company ? "No invoices found" : "No company selected"}</td></tr>
                ) : (
                  invoices.map((inv) => {
                    const total = inv.total ?? 0;
                    const paid = inv.total_paid ?? 0;
                    const balance = Number((total - paid).toFixed(2));
                    return (
                      <tr key={inv.id} className="align-top">
                        <td className="p-3 font-mono text-sm">{inv.invoice_number}</td>
                        <td className="p-3 text-sm">{inv.patient_id ?? "-"}</td>
                        <td className="p-3 text-sm">{inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : "-"}</td>
                        <td className="p-3 text-sm">{inv.due_at ? new Date(inv.due_at).toLocaleDateString() : "-"}</td>
                        <td className="p-3 text-sm">{(total).toFixed(2)}</td>
                        <td className="p-3 text-sm">{(paid).toFixed(2)}</td>
                        <td className="p-3 text-sm">{balance.toFixed(2)}</td>
                        <td className="p-3 text-sm">{inv.status}</td>
                        <td className="p-3 text-sm">
                          <div className="flex gap-2">
                            <button onClick={() => view(inv)} className="px-3 py-1 rounded-xl border">View</button>
                            <button onClick={() => openEdit(inv)} className="px-3 py-1 rounded-xl border"><Edit size={14}/> Edit</button>
                            <button onClick={() => openPayment(inv)} className="px-3 py-1 rounded-xl bg-emerald-600 text-white inline-flex items-center gap-2"><DollarSign size={14}/> Pay</button>
                            <button onClick={() => remove(inv)} className="px-3 py-1 rounded-xl bg-rose-600 text-white"><Trash size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-muted-foreground">Showing {invoices.length} invoices</div>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} className="px-3 py-2 rounded-xl border">Prev</button>
              <button onClick={() => setPage(p => p + 1)} className="px-3 py-2 rounded-xl border">Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Form Modal */}
      {showInvoiceFormFor && (
        <InvoiceForm
          initial={showInvoiceFormFor.invoice}
          companyId={company?.id}
          onClose={() => setShowInvoiceFormFor(null)}
          onSaved={async () => { setShowInvoiceFormFor(null); await fetchInvoices(); toast.success("Saved", "Invoice saved"); }}
        />
      )}

      {/* Payment Modal */}
      {showPaymentFor && (
        <PaymentForm
          invoiceId={showPaymentFor.invoiceId}
          companyId={showPaymentFor.companyId}
          onClose={() => setShowPaymentFor(null)}
          onSaved={async () => { setShowPaymentFor(null); await fetchInvoices(); toast.success("Payment recorded"); }}
        />
      )}

      {/* Invoice Detail Drawer / Modal (simple) */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-8">
          <div className="w-[680px] max-w-full bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-slate-500">Invoice</div>
                <div className="text-lg font-mono">{viewingInvoice.invoice_number}</div>
                <div className="text-sm text-slate-600 mt-1">Patient: {viewingInvoice.patient_id ?? "-"}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setViewingInvoice(null); }} className="px-3 py-1 rounded-xl border">Close</button>
                <button onClick={() => openEdit(viewingInvoice)} className="px-3 py-1 rounded-xl border">Edit</button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500">Issued</div>
                <div className="text-sm">{viewingInvoice.issued_at ? new Date(viewingInvoice.issued_at).toLocaleString() : "-"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Due</div>
                <div className="text-sm">{viewingInvoice.due_at ? new Date(viewingInvoice.due_at).toLocaleString() : "-"}</div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Total</div>
                <div className="text-sm font-semibold">{(viewingInvoice.total ?? 0).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Paid</div>
                <div className="text-sm">{(viewingInvoice.total_paid ?? 0).toFixed(2)}</div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium">Payments</h4>
              <PaymentsList invoiceId={viewingInvoice.id} onClose={() => setViewingInvoice(null)} onPaymentRecorded={async () => { await fetchInvoices(); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- PaymentsList ----------------------------- */
/* Simple component that lists payments and offers quick add button (uses PaymentForm modal) */
function PaymentsList({ invoiceId, onClose, onPaymentRecorded }: { invoiceId: string; onClose?: () => void; onPaymentRecorded?: () => void; }) {
  const toast = useToast();
  const { company } = useCompany();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  async function fetchPayments() {
    setLoading(true);
    try {
      if (!company) {
        setPayments([]);
        setLoading(false);
        return;
      }
      const res = await apiClient.get(`/hms/invoice-payments?invoice_id=${encodeURIComponent(invoiceId)}&limit=100`);
      setPayments(res.data?.data ?? []);
    } catch (err: any) {
      console.error("fetchPayments", err);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPayments(); /* eslint-disable-next-line */ }, [invoiceId, company]);

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">{payments.length} payments</div>
        <div className="flex gap-2">
          <button onClick={() => setShowPaymentForm(true)} className="px-3 py-1 rounded-xl bg-emerald-600 text-white inline-flex items-center gap-2"><DollarSign/> Add Payment</button>
          {onClose && <button onClick={onClose} className="px-3 py-1 rounded-xl border">Close</button>}
        </div>
      </div>

      <div className="mt-3">
        {loading ? <div className="p-4 text-center">Loading...</div> : (
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="p-3 rounded-xl border flex justify-between items-center">
                <div>
                  <div className="font-medium">{p.payment_reference ?? p.id}</div>
                  <div className="text-xs text-slate-500">{p.method} • {new Date(p.paid_at).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono">{Number(p.amount).toFixed(2)} {p.currency ?? "INR"}</div>
                </div>
              </div>
            ))}
            {payments.length === 0 && <div className="p-4 text-sm text-slate-500">No payments recorded</div>}
          </div>
        )}
      </div>

      {showPaymentForm && company && (
        <PaymentForm
          invoiceId={invoiceId}
          companyId={company.id}
          onClose={() => setShowPaymentForm(false)}
          onSaved={async () => { setShowPaymentForm(false); await fetchPayments(); onPaymentRecorded && onPaymentRecorded(); toast.success("Payment saved"); }}
        />
      )}
    </div>
  );
}
