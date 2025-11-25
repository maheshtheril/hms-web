// /app/dashboard/hr/employees/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function Employees() {
  return (
    <TableCard
      title="Employee Directory"
      columns={[
        "Employee ID",
        "Name",
        "Department",
        "Role",
        "Phone",
        "Status",
      ]}
    />
  );
}
