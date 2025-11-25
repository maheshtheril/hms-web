// /app/dashboard/billing/ipd/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function IPDBilling() {
  return (
    <TableCard
      title="IPD Billing"
      columns={[
        "Bill No.",
        "Patient",
        "Room Charges",
        "Procedures",
        "Total",
        "Status",
      ]}
    />
  );
}
