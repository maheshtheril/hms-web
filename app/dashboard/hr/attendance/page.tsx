// /app/dashboard/hr/attendance/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function Attendance() {
  return (
    <TableCard
      title="Employee Attendance"
      columns={[
        "Employee",
        "Check-in",
        "Check-out",
        "Status",
        "Working Hours",
      ]}
    />
  );
}
