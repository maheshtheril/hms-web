// /app/dashboard/imaging/studies/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function ImagingStudies() {
  return (
    <TableCard
      title="Imaging Studies"
      columns={[
        "Study ID",
        "Patient",
        "Modality",
        "Study Name",
        "Performed At",
        "Report Status",
      ]}
    />
  );
}
