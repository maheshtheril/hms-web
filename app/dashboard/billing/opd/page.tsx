// /app/dashboard/billing/opd/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function OPDBilling() {
  return (
    <TableCard
      title="OPD Billing"
      columns={[
        "Bill No.",
        "Patient",
        "Consultation",
        "Amount",
        "Payment Status",
        "Date",
      ]}
    />
  );
}
