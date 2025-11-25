// /app/dashboard/inventory/movements/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function Movements() {
  return (
    <TableCard
      title="Stock Movements"
      columns={[
        "Movement ID",
        "Product",
        "From",
        "To",
        "Qty",
        "Date",
        "Status",
      ]}
    />
  );
}
