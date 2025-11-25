// /app/dashboard/pharmacy/grn/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function GRN() {
  return (
    <TableCard
      title="Goods Receipt Notes"
      columns={[
        "GRN No.",
        "PO No.",
        "Vendor",
        "Received Qty",
        "Date",
        "Status",
      ]}
    />
  );
}
