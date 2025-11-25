// /app/dashboard/inventory/warehouses/[id]/page.tsx
"use client";

import GlassPanel from "../../../components/GlassPanel";
import TableCard from "../../../components/TableCard";

export default function WarehouseDetail() {
  return (
    <div className="space-y-6">
      <GlassPanel>
        <h1 className="text-xl font-semibold">Main Warehouse – Chennai</h1>
      </GlassPanel>

      <TableCard
        title="Bins / Locations"
        columns={["Bin", "Description", "Products", "Capacity", "Used"]}
      />

      <TableCard
        title="Recent Movements"
        columns={[
          "Movement",
          "Product",
          "Qty",
          "Type",
          "Date",
        ]}
      />
    </div>
  );
}
