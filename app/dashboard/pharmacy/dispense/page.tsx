// /app/dashboard/pharmacy/dispense/page.tsx
"use client";

import GlassPanel from "../../components/GlassPanel";
import GlassInput from "../../components/GlassInput";
import GlassButton from "../../components/GlassButton";

export default function Dispense() {
  return (
    <GlassPanel title="Dispense Medicine">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassInput label="Patient ID" placeholder="Enter patient ID" />
        <GlassInput label="Drug" placeholder="Search medicine..." />
        <GlassInput label="Qty" placeholder="1" />
        <GlassInput label="Prescribed By" placeholder="Doctor Name" />
      </div>

      <div className="mt-4 flex gap-4">
        <GlassButton>Dispense</GlassButton>
        <GlassButton>Print Receipt</GlassButton>
      </div>
    </GlassPanel>
  );
}
