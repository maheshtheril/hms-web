// /app/dashboard/lab/master/groups/page.tsx
"use client";

import TableCard from "../../../components/TableCard";

export default function LabGroups() {
  return (
    <TableCard
      title="Test Groups"
      columns={["Group", "Tests Included", "Status"]}
    />
  );
}
