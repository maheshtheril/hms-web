// /app/dashboard/hr/page.tsx
"use client";

import KPICard from "../components/KPICard";
import ChartCard from "../components/ChartCard";
import GlassPanel from "../components/GlassPanel";

export default function HRDashboard() {
  return (
    <div className="space-y-8">
      {/* KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard title="Total Staff" value="128" trend="+4%" />
        <KPICard title="Attendance Today" value="87%" trend="+2%" />
        <KPICard title="Leave Requests" value="6" trend="+1%" />
        <KPICard title="Open Positions" value="3" trend="+12%" />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Department-wise Strength" />
        <ChartCard title="Attendance Trend" />
      </div>

      <GlassPanel title="HR Alerts">
        <ul className="space-y-2 opacity-80 text-sm">
          <li>⚠ Nurse shift shortage – Monday Morning</li>
          <li>⚠ Appraisal pending for 12 staff</li>
          <li>⚠ 2 onboarding employees incomplete documents</li>
        </ul>
      </GlassPanel>
    </div>
  );
}
