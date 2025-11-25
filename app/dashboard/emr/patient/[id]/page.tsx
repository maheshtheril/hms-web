// /app/dashboard/emr/patient/[id]/page.tsx
"use client";

import GlassPanel from "../../../components/GlassPanel";

export default function PatientEMR() {
  return (
    <div className="space-y-6">
      
      {/* Patient Header */}
      <GlassPanel>
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-xl" />
          <div>
            <h1 className="text-2xl font-semibold text-white">John Doe</h1>
            <p className="text-sm opacity-70">Male · 32 · MRN: P001234</p>
          </div>
        </div>
      </GlassPanel>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          "Timeline",
          "Visits",
          "Vitals",
          "Lab Results",
          "Imaging",
          "Medications",
          "Allergies",
          "Documents",
        ].map((x) => (
          <GlassPanel key={x} className="text-center py-6 cursor-pointer">
            {x}
          </GlassPanel>
        ))}
      </div>

    </div>
  );
}
