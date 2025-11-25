// /app/dashboard/emr/patient/[id]/labs/page.tsx
"use client";

import TableCard from "../../../../components/TableCard";

export default function PatientLabs() {
  return (
    <TableCard
      title="Lab Results"
      columns={[
        "Test",
        "Result",
        "Units",
        "Reference",
        "Status",
        "Performed At",
      ]}
    />
  );
}
