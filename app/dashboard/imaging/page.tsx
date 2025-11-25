// /app/dashboard/imaging/page.tsx
"use client";

import KPICard from "../components/KPICard";
import ChartCard from "../components/ChartCard";
import GlassPanel from "../components/GlassPanel";

export default function ImagingDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard title="Pending Imaging Orders" value="48" trend="+5%" />
        <KPICard title="Studies Completed" value="22" trend="+8%" />
        <KPICard title="Reports Pending" value="14" trend="+2%" />
        <KPICard title="Avg TAT" value="1.2h" trend="-6%" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Modality Usage Today" />
        <ChartCard title="Imaging Volume by Type" />
      </div>

      <GlassPanel title="System Overview">
        <div className="grid grid-cols-2 gap-4 text-sm opacity-70">
          <div>XR Machine: Online</div>
          <div>CT Machine: Online</div>
          <div>MRI System: Booting</div>
          <div>Ultrasound: Online</div>
        </div>
      </GlassPanel>
    </div>
  );
}
