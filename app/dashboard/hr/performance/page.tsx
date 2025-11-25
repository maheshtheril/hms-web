// /app/dashboard/hr/performance/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function Performance() {
  return (
    <TableCard
      title="Performance & Appraisal"
      columns={[
        "Employee",
        "Rating",
        "Reviewer",
        "Period",
        "Remarks",
        "Status",
      ]}
    />
  );
}
