// /app/dashboard/lab/billing/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function LabBilling() {
  return (
    <TableCard
      title="Lab Billing"
      columns={[
        "Invoice",
        "Patient",
        "Tests",
        "Amount",
        "Status",
        "Date"
      ]}
    />
  );
}
