// /app/dashboard/emr/patient/[id]/medications/page.tsx
"use client";

import TableCard from "../../../../components/TableCard";

export default function PatientMeds() {
  return (
    <TableCard
      title="Medications"
      columns={[
        "Drug",
        "Dosage",
        "Route",
        "Frequency",
        "Start",
        "End",
        "Doctor",
      ]}
    />
  );
}
