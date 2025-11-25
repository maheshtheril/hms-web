// /app/dashboard/lab/page.tsx
"use client";

import KPICard from "../components/KPICard";
import ChartCard from "../components/ChartCard";
import GlassPanel from "../components/GlassPanel";

export default function LabDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard title="Pending Orders" value="112" trend="+12%" />
        <KPICard title="Samples Collected" value="74" trend="+3%" />
        <KPICard title="Results Ready" value="18" trend="+9%" />
        <KPICard title="Turnaround Time" value="2.4h" trend="-8%" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Daily Lab Orders" />
        <ChartCard title="Sample Types Breakdown" />
      </div>

      <GlassPanel title="System Status">
        <div className="grid grid-cols-2 gap-4 text-sm opacity-70">
          <div>Reagents Low: 3</div>
          <div>QC Issues: 1</div>
          <div>Machines Online: 4</div>
          <div>Technicians Active: 7</div>
        </div>
      </GlassPanel>
    </div>
  );
}
