// /app/dashboard/inventory/adjustments/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function Adjustments() {
  return (
    <TableCard
      title="Stock Adjustments"
      columns={[
        "Adjustment No.",
        "Product",
        "Qty Adjusted",
        "Reason",
        "Date",
        "Status",
      ]}
    />
  );
}
