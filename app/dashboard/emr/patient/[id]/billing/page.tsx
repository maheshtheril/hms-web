// /app/dashboard/emr/patient/[id]/billing/page.tsx
"use client";

import TableCard from "../../../../components/TableCard";

export default function PatientBilling() {
  return (
    <TableCard
      title="Billing Summary"
      columns={[
        "Bill No.",
        "Department",
        "Amount",
        "Paid",
        "Balance",
        "Status",
        "Date",
      ]}
    />
  );
}
