// /app/dashboard/imaging/worklist/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function ImagingWorklist() {
  return (
    <TableCard
      title="Modality Worklist"
      columns={[
        "Patient",
        "Modality",
        "Procedure",
        "Scheduled Time",
        "Status",
        "Action",
      ]}
    />
  );
}
