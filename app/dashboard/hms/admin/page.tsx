"use client";

import KPICard from "../../components/KPICard";
import ChartCard from "../../components/ChartCard";
import GlassPanel from "../../components/GlassPanel";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* TOP ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard title="Total Patients" value="12,430" trend="+8%" />
        <KPICard title="Total Staff" value="320" trend="+2%" />
        <KPICard title="Monthly Revenue" value="₹48,20,000" trend="+12%" />
        <KPICard title="Clinics Active" value="18" trend="+1" />
      </div>

      {/* MID ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Revenue Growth" />
        <ChartCard title="OPD vs IPD Statistics" />
      </div>

      {/* SYSTEM PANEL */}
      <GlassPanel title="System Overview">
        <div className="grid grid-cols-2 gap-4 text-sm opacity-80">
          <div>Pending Lab Orders: 34</div>
          <div>Billing Issues: 3</div>
          <div>Today's Appointments: 420</div>
          <div>Active Sessions: 140</div>
        </div>
      </GlassPanel>
    </div>
  );
}
