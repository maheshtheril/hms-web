// /app/dashboard/inventory/grn/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function GRN() {
  return (
    <TableCard
      title="Goods Receipt Notes (GRN)"
      columns={[
        "GRN No.",
        "PO No.",
        "Supplier",
        "Items",
        "Received Qty",
        "Date",
        "Status",
      ]}
    />
  );
}
