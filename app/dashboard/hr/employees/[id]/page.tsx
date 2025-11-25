// /app/dashboard/hr/employees/[id]/page.tsx
"use client";

import GlassPanel from "../../../components/GlassPanel";

export default function EmployeeProfile() {
  return (
    <div className="space-y-6">
      <GlassPanel>
        <h2 className="text-xl font-semibold">John Matthew (Nurse)</h2>
        <p className="opacity-80 text-sm">Employee ID: EMP1021</p>
      </GlassPanel>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassPanel title="Personal Info"></GlassPanel>
        <GlassPanel title="Job Info"></GlassPanel>
        <GlassPanel title="Bank / Payroll"></GlassPanel>
      </div>

      <GlassPanel title="Documents"></GlassPanel>
      <GlassPanel title="Attendance"></GlassPanel>
      <GlassPanel title="Performance"></GlassPanel>
    </div>
  );
}
