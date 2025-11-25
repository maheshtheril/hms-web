// /app/dashboard/inventory/categories/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function Categories() {
  return (
    <TableCard
      title="Product Categories"
      columns={["Category", "Parent", "Products"]}
    />
  );
}
