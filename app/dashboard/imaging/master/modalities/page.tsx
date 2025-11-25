// /app/dashboard/imaging/master/modalities/page.tsx
"use client";

import TableCard from "../../../components/TableCard";

export default function Modalities() {
  return (
    <TableCard
      title="Imaging Modalities"
      columns={[
        "Modality",
        "Description",
        "Status",
        "Last Calibration",
      ]}
    />
  );
}
