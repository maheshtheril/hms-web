"use client";

import KPICard from "../../components/KPICard";
import TableCard from "../../components/TableCard";

export default function StaffDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title="My Patients Today" value="32" />
        <KPICard title="Vitals Pending" value="11" />
        <KPICard title="Orders to Execute" value="7" />
      </div>

      <TableCard
        title="My Tasks"
        columns={["Task", "Patient", "Due", "Status"]}
      />
    </div>
  );
}
