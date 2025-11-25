// /app/dashboard/emr/page.tsx
"use client";

import TableCard from "../components/TableCard";

export default function EMRHome() {
  return (
    <TableCard
      title="Patients"
      columns={[
        "Patient ID",
        "Name",
        "Age",
        "Gender",
        "Phone",
        "Last Visit",
        "Status",
      ]}
    />
  );
}
