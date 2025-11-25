"use client";

import KPICard from "../../components/KPICard";
import TableCard from "../../components/TableCard";

export default function ManagerDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title="Today's Appointments" value="186" />
        <KPICard title="Pending Lab Orders" value="44" />
        <KPICard title="Available Beds" value="27" />
      </div>

      <TableCard 
        title="Live Appointments" 
        columns={["Patient", "Doctor", "Time", "Status"]} 
      />
    </div>
  );
}
