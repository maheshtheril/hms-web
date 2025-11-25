// /app/dashboard/lab/results/page.tsx
"use client";

import GlassPanel from "../../components/GlassPanel";
import GlassInput from "../../components/GlassInput";
import GlassButton from "../../components/GlassButton";

export default function ResultEntry() {
  return (
    <GlassPanel title="Result Entry">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassInput label="Order ID" />
        <GlassInput label="Test Name" />
        <GlassInput label="Value" />
        <GlassInput label="Reference Range" />
      </div>

      <div className="mt-4">
        <GlassButton>Save Result</GlassButton>
      </div>
    </GlassPanel>
  );
}
