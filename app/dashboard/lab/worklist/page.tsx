// /app/dashboard/lab/worklist/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function Worklist() {
  return (
    <TableCard
      title="Lab Worklist"
      columns={[
        "Test",
        "Sample ID",
        "Analyser",
        "Priority",
        "Assigned To",
        "Status",
        "Actions",
      ]}
    />
  );
}
