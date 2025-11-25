// /app/dashboard/lab/master/tests/page.tsx
"use client";

import TableCard from "../../../components/TableCard";

export default function LabTests() {
  return (
    <TableCard
      title="Lab Tests List"
      columns={[
        "Test Name",
        "Category",
        "Method",
        "Sample Type",
        "Status",
      ]}
    />
  );
}
