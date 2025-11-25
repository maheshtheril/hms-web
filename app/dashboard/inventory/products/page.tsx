// /app/dashboard/inventory/products/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function Products() {
  return (
    <TableCard
      title="Products / SKUs"
      columns={[
        "SKU",
        "Name",
        "Category",
        "UOM",
        "On Hand",
        "Available",
        "Value",
      ]}
    />
  );
}
