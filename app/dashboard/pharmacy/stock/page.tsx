// /app/dashboard/pharmacy/stock/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function StockLevels() {
  return (
    <TableCard
      title="Pharmacy Stock Levels"
      columns={[
        "Drug",
        "Batch",
        "Expiry",
        "Qty On Hand",
        "Reorder Level",
        "Status",
      ]}
    />
  );
}
