// /app/dashboard/imaging/reporting/page.tsx
"use client";

import GlassPanel from "../../components/GlassPanel";
import GlassInput from "../../components/GlassInput";
import GlassButton from "../../components/GlassButton";

export default function Reporting() {
  return (
    <GlassPanel title="Radiology Report">
      <div className="grid gap-4">
        <GlassInput label="Study ID" />
        <textarea
          placeholder="Report Findings..."
          className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white h-40"
        />
        <textarea
          placeholder="Impression..."
          className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white h-24"
        />
        <GlassButton>Save Report</GlassButton>
      </div>
    </GlassPanel>
  );
}
