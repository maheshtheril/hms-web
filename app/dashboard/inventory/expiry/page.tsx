// /app/dashboard/inventory/expiry/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function ExpiryManagement() {
  return (
    <TableCard
      title="Expiry Dashboard"
      columns={[
        "Product",
        "Batch",
        "Expiry Date",
        "Qty",
        "Status",
      ]}
    />
  );
}
