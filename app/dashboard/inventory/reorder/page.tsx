// /app/dashboard/inventory/reorder/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function ReorderReport() {
  return (
    <TableCard
      title="Reorder Report"
      columns={[
        "Product",
        "On Hand",
        "Reorder Level",
        "Qty To Order",
        "Supplier",
      ]}
    />
  );
}
