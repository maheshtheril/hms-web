// /app/dashboard/lab/sample/page.tsx
"use client";

import GlassPanel from "../../components/GlassPanel";
import GlassInput from "../../components/GlassInput";
import GlassButton from "../../components/GlassButton";

export default function SampleCollection() {
  return (
    <GlassPanel title="Sample Collection">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassInput label="Order ID" placeholder="Scan / Enter Order ID" />
        <GlassInput label="Sample Type" placeholder="Blood / Urine / Swab" />
        <GlassInput label="Collector" placeholder="Technician Name" />
      </div>

      <div className="mt-4">
        <GlassButton>Collect Sample</GlassButton>
      </div>
    </GlassPanel>
  );
}
