// /app/dashboard/emr/patient/[id]/diagnoses/page.tsx
"use client";

import TableCard from "../../../../components/TableCard";

export default function PatientDiagnoses() {
  return (
    <TableCard
      title="Diagnoses"
      columns={[
        "ICD Code",
        "Diagnosis",
        "Type",
        "Clinician",
        "Date",
      ]}
    />
  );
}
