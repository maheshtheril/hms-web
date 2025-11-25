// /app/dashboard/inventory/transfers/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function Transfers() {
  return (
    <TableCard
      title="Stock Transfers"
      columns={[
        "Transfer ID",
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
