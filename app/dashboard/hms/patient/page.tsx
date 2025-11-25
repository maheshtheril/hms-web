"use client";

import KPICard from "../../components/KPICard";
import GlassPanel from "../../components/GlassPanel";

export default function PatientDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title="Upcoming Appointments" value="2" />
        <KPICard title="Lab Results Ready" value="1" />
        <KPICard title="Pending Bills" value="0" />
      </div>

      <GlassPanel title="Recent Records">
        <div className="text-sm opacity-80">
          - Blood Test (Completed)  
          - MRI Brain (Pending Report)  
        </div>
      </GlassPanel>
    </div>
  );
}
