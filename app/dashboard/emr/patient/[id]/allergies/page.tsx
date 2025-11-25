// /app/dashboard/emr/patient/[id]/allergies/page.tsx
"use client";

import TableCard from "../../../../components/TableCard";

export default function PatientAllergies() {
  return (
    <TableCard
      title="Allergies"
      columns={["Allergen", "Severity", "Reaction", "Notes", "Recorded At"]}
    />
  );
}
