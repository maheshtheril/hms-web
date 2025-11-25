// /app/dashboard/lab/validation/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function Validation() {
  return (
    <TableCard
      title="Pending Validation"
      columns={[
        "Order ID",
        "Patient",
        "Test",
        "Result",
        "Entered By",
        "Actions",
      ]}
    />
  );
}
