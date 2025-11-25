// /app/dashboard/imaging/master/protocols/page.tsx
"use client";

import TableCard from "../../../components/TableCard";

export default function ImagingProtocols() {
  return (
    <TableCard
      title="Imaging Protocols"
      columns={[
        "Protocol",
        "Modality",
        "Parameters",
        "Updated At",
      ]}
    />
  );
}
