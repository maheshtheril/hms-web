// /app/dashboard/pharmacy/purchase/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function PurchaseOrders() {
  return (
    <TableCard
      title="Purchase Orders"
      columns={[
        "PO No.",
        "Vendor",
        "Items",
        "Amount",
        "Status",
        "Date",
      ]}
    />
  );
}
