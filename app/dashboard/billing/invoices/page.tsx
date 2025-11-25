// /app/dashboard/billing/invoices/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function ERPInvoices() {
  return (
    <TableCard
      title="Invoices"
      columns={[
        "Invoice No.",
        "Customer",
        "Amount",
        "Due Date",
        "Status",
        "Created At",
      ]}
    />
  );
}
