// /app/dashboard/inventory/warehouses/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function Warehouses() {
  return (
    <TableCard
      title="Warehouses"
      columns={[
        "Warehouse",
        "Location",
        "Manager",
        "Bins",
        "Stock Value",
      ]}
    />
  );
}
