// /app/dashboard/hr/shifts/page.tsx
"use client";

import GlassPanel from "../../components/GlassPanel";
import GlassButton from "../../components/GlassButton";

export default function Shifts() {
  return (
    <GlassPanel title="Shift Templates">
      <div className="flex gap-4">
        <GlassButton>+ Create Shift</GlassButton>
      </div>

      <ul className="mt-4 space-y-3">
        {[
          "Morning (6 AM - 2 PM)",
          "Evening (2 PM - 10 PM)",
          "Night (10 PM - 6 AM)",
        ].map((x) => (
          <li key={x} className="glass-hover p-3 rounded-xl">{x}</li>
        ))}
      </ul>
    </GlassPanel>
  );
}
