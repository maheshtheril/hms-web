// /app/dashboard/inventory/stock-ledger/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function StockLedger() {
  return (
    <TableCard
      title="Stock Ledger"
      columns={[
        "Date",
        "Product",
        "Type",
        "Qty In",
        "Qty Out",
        "Balance",
        "Reference",
      ]}
    />
  );
}
