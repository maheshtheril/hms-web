// /app/dashboard/emr/patient/[id]/imaging/page.tsx
"use client";

import TableCard from "../../../../components/TableCard";

export default function PatientImaging() {
  return (
    <TableCard
      title="Imaging Studies"
      columns={[
        "Study",
        "Modality",
        "Status",
        "Reported By",
        "Date",
      ]}
    />
  );
}
