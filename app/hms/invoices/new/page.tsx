// app/hms/invoices/new/page.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import CompanySelector from "@/components/CompanySelector";
import { useCompany } from "@/app/providers/CompanyProvider";
import { useToast } from "@/components/toast/ToastProvider";
import InvoiceForm from "@/app/hms/invoices/InvoiceForm"; // adjust path if you placed it elsewhere

export default function NewInvoicePage() {
  const router = useRouter();
  const toast = useToast();
  const { company } = useCompany();

  async function handleSaved() {
    toast.success("Invoice created", "Success");
    // navigate back to invoices list
    router.push("/hms/invoices");
  }

  return (
    <div className="min-h-screen p-8">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto mb-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Create Invoice</h1>
            <p className="text-sm text-slate-500">New invoice — create and send to patient</p>
          </div>

          <div className="ml-4">
            <CompanySelector />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/hms/invoices")}
            className="px-3 py-2 rounded-xl border"
          >
            Cancel
          </button>
        </div>
      </motion.header>

      <main className="max-w-6xl mx-auto">
        {!company ? (
          <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md text-center text-slate-600">
            Select a company to create an invoice.
          </div>
        ) : (
          // Render the InvoiceForm as the main content; InvoiceForm is a client component/modal style
          <InvoiceForm
            initial={undefined}
            companyId={company.id}
            onClose={() => router.push("/hms/invoices")}
            onSaved={handleSaved}
          />
        )}
      </main>
    </div>
  );
}
