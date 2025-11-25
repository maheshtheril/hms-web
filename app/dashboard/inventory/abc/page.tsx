// /app/dashboard/inventory/abc/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function ABCAnalysis() {
  return (
    <TableCard
      title="ABC Analysis"
      columns={[
        "Product",
        "Annual Consumption Value",
        "Category",
        "Cumulative %",
      ]}
    />
  );
}
