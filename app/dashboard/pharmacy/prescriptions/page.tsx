// /app/dashboard/pharmacy/prescriptions/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function PrescriptionFeed() {
  return (
    <TableCard
      title="Prescriptions Feed"
      columns={[
        "Prescription ID",
        "Patient",
        "Doctor",
        "Medicines",
        "Status",
        "Created At",
      ]}
    />
  );
}
