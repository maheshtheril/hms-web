// /app/dashboard/imaging/billing/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function ImagingBilling() {
  return (
    <TableCard
      title="Imaging Billing"
      columns={[
        "Invoice",
        "Patient",
        "Study",
        "Amount",
        "Status",
        "Date",
      ]}
    />
  );
}
