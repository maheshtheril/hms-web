// /app/dashboard/inventory/products/[id]/page.tsx
"use client";

import GlassPanel from "../../../components/GlassPanel";
import TableCard from "../../../components/TableCard";

export default function ProductDetail() {
  return (
    <div className="space-y-6">

      <GlassPanel>
        <h1 className="text-2xl font-semibold">Paracetamol 500mg</h1>
        <p className="opacity-70">SKU: MED-00121</p>
      </GlassPanel>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassPanel title="Stock Summary"></GlassPanel>
        <GlassPanel title="Pricing"></GlassPanel>
        <GlassPanel title="Batch / Lot Info"></GlassPanel>
      </div>

      <TableCard
        title="Recent Movements"
        columns={["Type", "Qty", "From", "To", "Date", "Reference"]}
      />
    </div>
  );
}
