// /app/dashboard/billing/credit-notes/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function CreditNotes() {
  return (
    <TableCard
      title="Credit Notes"
      columns={[
        "Credit Note",
        "Invoice",
        "Customer/Patient",
        "Amount",
        "Reason",
        "Date",
      ]}
    />
  );
}
