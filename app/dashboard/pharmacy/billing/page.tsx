// /app/dashboard/pharmacy/billing/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function PharmacyBilling() {
  return (
    <TableCard
      title="Pharmacy Billing"
      columns={[
        "Invoice",
        "Patient",
        "Items",
        "Amount",
        "Payment Status",
        "Date",
      ]}
    />
  );
}
