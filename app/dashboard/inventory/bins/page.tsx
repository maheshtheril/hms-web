// /app/dashboard/inventory/bins/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function Bins() {
  return (
    <TableCard
      title="Bins / Locations"
      columns={["Bin Code", "Rack", "Level", "Warehouse", "Products"]}
    />
  );
}
