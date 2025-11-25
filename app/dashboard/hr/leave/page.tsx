// /app/dashboard/hr/leave/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function LeaveManagement() {
  return (
    <TableCard
      title="Leave Requests"
      columns={[
        "Employee",
        "Type",
        "From",
        "To",
        "Status",
        "Approved By",
      ]}
    />
  );
}
