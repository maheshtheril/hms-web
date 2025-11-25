// /app/dashboard/emr/patient/[id]/documents/page.tsx
"use client";

import TableCard from "../../../../components/TableCard";

export default function PatientDocuments() {
  return (
    <TableCard
      title="Documents"
      columns={[
        "Type",
        "Description",
        "Uploaded By",
        "Date",
        "File",
      ]}
    />
  );
}
