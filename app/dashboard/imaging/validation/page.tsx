// /app/dashboard/imaging/validation/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function ImagingValidation() {
  return (
    <TableCard
      title="Reports Pending Validation"
      columns={[
        "Study ID",
        "Patient",
        "Modality",
        "Radiologist",
        "Status",
        "Action",
      ]}
    />
  );
}
